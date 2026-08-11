const axios = require('axios');
const db = require('../db/connection');
const ensureAllianceSchema = require('../db/alliance-schema');

let interval;
let processing = false;

const tokenFor = (settings) => process.env[settings?.access_token_env || 'ALLIANCE_WA_ACCESS_TOKEN'];
const valueFor = (field, prospect) => String(prospect[field] || (field === 'name' ? prospect.business_name : '') || 'there');

async function claimRecipient() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT r.id,r.campaign_id,r.prospect_id,c.template_name,c.template_language,c.template_body,c.parameter_mapping,
              c.phone_number_id,c.created_at AS campaign_created_at,c.followup_template_id,c.followup_delay_days,c.followup_delay_minutes,p.name,p.business_name,p.location,p.phone,p.status AS prospect_status,
              p.consent,p.consent_source,p.suppressed,s.access_token_env,s.active AS sender_active,
              cv.last_inbound_at
       FROM alliance_whatsapp_campaign_recipients r
       JOIN alliance_whatsapp_campaigns c ON c.id=r.campaign_id
       JOIN alliance_prospects p ON p.id=r.prospect_id
       LEFT JOIN alliance_inbox_settings s ON s.phone_number_id=c.phone_number_id
       LEFT JOIN alliance_inbox_contacts ic ON ic.prospect_id=p.id
       LEFT JOIN alliance_inbox_conversations cv ON cv.contact_id=ic.id
       WHERE r.status='queued' AND r.scheduled_at<=NOW() AND c.status IN ('scheduled','running')
       ORDER BY r.scheduled_at,r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`
    );
    if (!result.rowCount) { await client.query('COMMIT'); return null; }
    const row = result.rows[0];
    const reason = !row.phone ? 'missing_phone' : !row.consent || !row.consent_source ? 'whatsapp_consent_missing'
      : row.suppressed ? 'suppressed' : ['converted','closed','not_interested','unsubscribed','replied'].includes(row.prospect_status) ? `prospect_${row.prospect_status}`
        : row.last_inbound_at && new Date(row.last_inbound_at) >= new Date(row.campaign_created_at) ? 'recipient_replied'
          : row.sender_active === false ? 'sender_inactive' : null;
    if (reason) {
      await client.query(`UPDATE alliance_whatsapp_campaign_recipients SET status='skipped',error_message=$1 WHERE id=$2`, [reason,row.id]);
      await client.query('COMMIT'); return { skipped:true };
    }
    await client.query(`UPDATE alliance_whatsapp_campaign_recipients SET status='sending',error_message=NULL WHERE id=$1`, [row.id]);
    await client.query(`UPDATE alliance_whatsapp_campaigns SET status='running',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=$1`, [row.campaign_id]);
    await client.query('COMMIT'); return row;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function storeInboxMessage(job, waMessageId, rendered) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let contact = await client.query(
      `SELECT id FROM alliance_inbox_contacts
       WHERE prospect_id=$1
       ORDER BY id LIMIT 1 FOR UPDATE`,
      [job.prospect_id]
    );
    if (!contact.rowCount) {
      contact = await client.query(
        `SELECT id FROM alliance_inbox_contacts
         WHERE wa_id=$1 OR phone=$1
         ORDER BY id LIMIT 1 FOR UPDATE`,
        [job.phone]
      );
    }
    if (contact.rowCount) {
      contact = await client.query(
        `UPDATE alliance_inbox_contacts c
         SET name=COALESCE($2,c.name),
             prospect_id=COALESCE(c.prospect_id,$3),
             phone=CASE WHEN NOT EXISTS (
               SELECT 1 FROM alliance_inbox_contacts other WHERE other.id<>c.id AND other.phone=$1
             ) THEN $1 ELSE c.phone END,
             wa_id=CASE WHEN NOT EXISTS (
               SELECT 1 FROM alliance_inbox_contacts other WHERE other.id<>c.id AND other.wa_id=$1
             ) THEN $1 ELSE c.wa_id END,
             source='alliance_bulk',
             custom_fields=COALESCE(c.custom_fields,'{}'::jsonb) || jsonb_build_object('business_name',$4::text),
             updated_at=NOW()
         WHERE c.id=$5 RETURNING id`,
        [job.phone,job.name || job.business_name,job.prospect_id,job.business_name,contact.rows[0].id]
      );
    } else {
      contact = await client.query(
        `INSERT INTO alliance_inbox_contacts (wa_id,phone,name,source,prospect_id,custom_fields)
         VALUES ($1,$1,$2,'alliance_bulk',$3,jsonb_build_object('business_name',$4::text))
         RETURNING id`,
        [job.phone,job.name || job.business_name,job.prospect_id,job.business_name]
      );
    }
    const conversation = await client.query(
      `INSERT INTO alliance_inbox_conversations (contact_id,phone_number_id,last_message,last_message_at)
       VALUES ($1,$2,$3,NOW()) ON CONFLICT (contact_id) DO UPDATE SET last_message=EXCLUDED.last_message,last_message_at=NOW(),updated_at=NOW() RETURNING id`,
      [contact.rows[0].id,job.phone_number_id,rendered]
    );
    const message = await client.query(
      `INSERT INTO alliance_inbox_messages (conversation_id,contact_id,wa_msg_id,direction,msg_type,content,status,raw_payload,sent_at)
       VALUES ($1,$2,$3,'outbound','template',$4,'sent',$5::jsonb,NOW())
       ON CONFLICT (wa_msg_id) DO UPDATE SET status=EXCLUDED.status
       RETURNING *`,
      [conversation.rows[0].id,contact.rows[0].id,waMessageId,rendered,JSON.stringify({ purpose:'bulk_campaign',campaign_id:job.campaign_id,template_name:job.template_name })]
    );
    await client.query('COMMIT');
    return { contactId: contact.rows[0].id, message: message.rows[0] || null };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function sendRecipient(job, io) {
  let waMessageId = null;
  try {
    const token = tokenFor(job);
    if (!token || !job.phone_number_id) throw new Error('Alliance WhatsApp credentials are not configured.');
    const mapping = Array.isArray(job.parameter_mapping) ? job.parameter_mapping : [];
    const parameters = mapping.map((field) => valueFor(field,job));
    const payload = { messaging_product:'whatsapp',recipient_type:'individual',to:job.phone,type:'template',template:{ name:job.template_name,language:{code:job.template_language || 'en'},...(parameters.length?{components:[{type:'body',parameters:parameters.map((text)=>({type:'text',text}))}]}:{}) } };
    const response = await axios.post(`https://graph.facebook.com/v19.0/${job.phone_number_id}/messages`,payload,{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},timeout:20000});
    waMessageId = response.data?.messages?.[0]?.id || null;
    await db.query(`UPDATE alliance_whatsapp_campaign_recipients SET status='sent',wa_msg_id=$1,sent_at=NOW() WHERE id=$2`,[waMessageId,job.id]);
    const rendered = mapping.reduce((body,field,index)=>body.replaceAll(`{{${index+1}}}`,valueFor(field,job)),job.template_body);
    const inbox = await storeInboxMessage(job,waMessageId,rendered);
    if(job.followup_template_id){
      await db.query(`INSERT INTO alliance_whatsapp_followup_jobs(campaign_id,prospect_id,followup_no,scheduled_at,activity_cutoff_at,trigger_source) VALUES($1,$2,1,NOW()+($3*INTERVAL '1 minute'),NOW(),'initial_campaign') ON CONFLICT DO NOTHING`,[job.campaign_id,job.prospect_id,Number(job.followup_delay_minutes)||(Number(job.followup_delay_days)||4)*1440]);
    }
    io?.emit('alliance_campaign_updated',{campaign_id:job.campaign_id,prospect_id:job.prospect_id,channel:'whatsapp',status:'sent'});
    io?.emit('alliance_contacts_changed',{contact_id:String(inbox.contactId)});
    if(inbox.message) io?.emit('alliance_outgoing_message',{lead_id:String(inbox.contactId),message:{...inbox.message,type:inbox.message.msg_type,timestamp:inbox.message.sent_at}});
  } catch (error) {
    const reason=error.response?.data?.error?.message||error.message||'WhatsApp send failed.';
    await db.query(
      `UPDATE alliance_whatsapp_campaign_recipients
       SET status=$1,error_message=$2 WHERE id=$3`,
      [waMessageId ? 'sent' : 'failed', String(waMessageId ? `Meta accepted the message, but Inbox logging failed: ${reason}` : reason).slice(0,2000), job.id]
    );
  }
  await db.query(
    `UPDATE alliance_whatsapp_campaigns c SET status='completed',completed_at=NOW(),updated_at=NOW()
     WHERE c.id=$1 AND NOT EXISTS (SELECT 1 FROM alliance_whatsapp_campaign_recipients r WHERE r.campaign_id=c.id AND r.status IN ('queued','sending'))`,
    [job.campaign_id]
  );
}

async function processAllianceWhatsAppCampaigns(io) {
  if (processing) return; processing=true;
  try { for(let count=0;count<20;count+=1){const job=await claimRecipient();if(!job)break;if(job.skipped)continue;await sendRecipient(job,io);} }
  finally { processing=false; }
}

async function startAllianceWhatsAppCampaignWorker(io){await ensureAllianceSchema();if(interval)return;setTimeout(()=>processAllianceWhatsAppCampaigns(io).catch(console.error),5000);interval=setInterval(()=>processAllianceWhatsAppCampaigns(io).catch(console.error),30000);interval.unref?.();}

async function claimAllianceWhatsAppFollowups(limit=20,claimId='n8n'){
  const client=await db.connect();try{await client.query('BEGIN');await client.query(`UPDATE alliance_whatsapp_followup_jobs SET status='pending',claimed_at=NULL,claim_id=NULL WHERE status='claimed' AND claimed_at<NOW()-INTERVAL '15 minutes'`);const claimed=await client.query(`WITH due AS(SELECT id FROM alliance_whatsapp_followup_jobs WHERE status='pending' AND scheduled_at<=NOW() ORDER BY scheduled_at,id FOR UPDATE SKIP LOCKED LIMIT $1) UPDATE alliance_whatsapp_followup_jobs j SET status='claimed',claimed_at=NOW(),claim_id=$2 FROM due WHERE j.id=due.id RETURNING j.id`,[Math.min(Math.max(Number(limit)||20,1),100),String(claimId).slice(0,255)]);let rows=[];if(claimed.rowCount){rows=(await client.query(`SELECT j.id,j.followup_no,j.scheduled_at,p.id AS prospect_id,p.name,p.business_name,p.phone,p.status AS lead_status,c.id AS campaign_id,c.name AS campaign_name,c.followup_template_name AS template_name,c.followup_template_language AS language,c.followup_template_body AS template_body,c.followup_parameter_mapping AS parameter_mapping FROM alliance_whatsapp_followup_jobs j JOIN alliance_whatsapp_campaigns c ON c.id=j.campaign_id JOIN alliance_prospects p ON p.id=j.prospect_id WHERE j.id=ANY($1::bigint[]) ORDER BY j.scheduled_at`,[claimed.rows.map(row=>row.id)])).rows;}await client.query('COMMIT');return rows;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function scheduleAllianceInactivityReminder(prospectId, activityAt = new Date()) {
  if (!prospectId) return null;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const configuration = await client.query(
      `SELECT c.id AS campaign_id,
              COALESCE(c.followup_delay_minutes,c.followup_delay_days*1440,5760)::int AS delay_minutes,
              p.status AS prospect_status
       FROM alliance_whatsapp_campaign_recipients r
       JOIN alliance_whatsapp_campaigns c ON c.id=r.campaign_id
       JOIN alliance_prospects p ON p.id=r.prospect_id
       WHERE r.prospect_id=$1 AND c.followup_template_id IS NOT NULL
         AND c.status<>'stopped'
       ORDER BY COALESCE(r.sent_at,c.started_at,c.created_at) DESC LIMIT 1
       FOR UPDATE OF p`,
      [prospectId]
    );
    if (!configuration.rowCount || ['converted','closed','not_interested','unsubscribed'].includes(configuration.rows[0].prospect_status)) {
      await client.query('COMMIT');
      return null;
    }
    await client.query(
      `UPDATE alliance_whatsapp_followup_jobs SET status='cancelled',error_message='Replaced by a newer admin activity timer.'
       WHERE prospect_id=$1 AND status IN ('pending','claimed')`,
      [prospectId]
    );
    const next = await client.query(
      `SELECT COALESCE(MAX(followup_no),0)+1 AS followup_no
       FROM alliance_whatsapp_followup_jobs WHERE campaign_id=$1 AND prospect_id=$2`,
      [configuration.rows[0].campaign_id, prospectId]
    );
    const job = await client.query(
      `INSERT INTO alliance_whatsapp_followup_jobs
        (campaign_id,prospect_id,followup_no,scheduled_at,activity_cutoff_at,trigger_source)
       VALUES($1,$2,$3,$4::timestamptz+($5*INTERVAL '1 minute'),$4::timestamptz,'admin_outbound')
       RETURNING id,scheduled_at,followup_no`,
      [configuration.rows[0].campaign_id, prospectId, next.rows[0].followup_no, activityAt, configuration.rows[0].delay_minutes]
    );
    await client.query('COMMIT');
    return job.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function sendAllianceWhatsAppFollowup(jobId,io){
  const result=await db.query(`SELECT j.*,c.status AS campaign_status,c.phone_number_id,c.followup_template_name AS template_name,c.followup_template_language AS template_language,c.followup_template_body AS template_body,c.followup_parameter_mapping AS parameter_mapping,c.followup_repeat_days,c.max_followups,c.created_at AS campaign_created_at,p.name,p.business_name,p.location,p.phone,p.status AS prospect_status,p.consent,p.consent_source,p.suppressed,s.access_token_env,cv.last_inbound_at FROM alliance_whatsapp_followup_jobs j JOIN alliance_whatsapp_campaigns c ON c.id=j.campaign_id JOIN alliance_prospects p ON p.id=j.prospect_id LEFT JOIN alliance_inbox_settings s ON s.phone_number_id=c.phone_number_id LEFT JOIN alliance_inbox_contacts ic ON ic.prospect_id=p.id LEFT JOIN alliance_inbox_conversations cv ON cv.contact_id=ic.id WHERE j.id=$1`,[jobId]);if(!result.rowCount)throw Object.assign(new Error('Follow-up job not found.'),{status:404});const job=result.rows[0];
  const reason=!['claimed','pending'].includes(job.status)?`job_${job.status}`:job.campaign_status==='stopped'?'campaign_stopped':!job.consent||!job.consent_source?'whatsapp_consent_missing':job.suppressed?'suppressed':['converted','closed','not_interested','unsubscribed'].includes(job.prospect_status)?`prospect_${job.prospect_status}`:job.last_inbound_at&&new Date(job.last_inbound_at)>new Date(job.activity_cutoff_at||job.campaign_created_at)?'recipient_replied_after_latest_activity':null;
  if(reason){await db.query(`UPDATE alliance_whatsapp_followup_jobs SET status='skipped',error_message=$1 WHERE id=$2`,[reason,job.id]);return{sent:false,skipped:true,reason};}
  await db.query(`UPDATE alliance_whatsapp_followup_jobs SET status='sending',error_message=NULL WHERE id=$1`,[job.id]);try{const token=tokenFor(job);if(!token)throw new Error('Alliance WhatsApp access token is missing.');const mapping=Array.isArray(job.parameter_mapping)?job.parameter_mapping:[];const parameters=mapping.map(field=>valueFor(field,job));const payload={messaging_product:'whatsapp',to:job.phone,type:'template',template:{name:job.template_name,language:{code:job.template_language||'en'},...(parameters.length?{components:[{type:'body',parameters:parameters.map(text=>({type:'text',text}))}]}:{})}};const response=await axios.post(`https://graph.facebook.com/v19.0/${job.phone_number_id}/messages`,payload,{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},timeout:20000});const waMessageId=response.data?.messages?.[0]?.id||null;await db.query(`UPDATE alliance_whatsapp_followup_jobs SET status='sent',wa_msg_id=$1,sent_at=NOW() WHERE id=$2`,[waMessageId,job.id]);const rendered=mapping.reduce((body,field,index)=>body.replaceAll(`{{${index+1}}}`,valueFor(field,job)),job.template_body);const inbox=await storeInboxMessage(job,waMessageId,rendered);io?.emit('alliance_campaign_updated',{campaign_id:job.campaign_id,prospect_id:job.prospect_id,channel:'whatsapp_followup',status:'sent'});io?.emit('alliance_contacts_changed',{contact_id:String(inbox.contactId)});if(inbox.message)io?.emit('alliance_outgoing_message',{lead_id:String(inbox.contactId),message:{...inbox.message,type:inbox.message.msg_type,timestamp:inbox.message.sent_at}});return{sent:true,wa_msg_id:waMessageId};}catch(error){const reason=error.response?.data?.error?.message||error.message;await db.query(`UPDATE alliance_whatsapp_followup_jobs SET status='failed',error_message=$1 WHERE id=$2`,[String(reason).slice(0,2000),job.id]);throw error;}
}
module.exports={startAllianceWhatsAppCampaignWorker,processAllianceWhatsAppCampaigns,claimAllianceWhatsAppFollowups,sendAllianceWhatsAppFollowup,scheduleAllianceInactivityReminder};
