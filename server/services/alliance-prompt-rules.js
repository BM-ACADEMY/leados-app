const db = require('../db/connection');

async function getAlliancePromptRules(job, channel, audience) {
  const result = await db.query(
    `SELECT id,name,job,channel,audience,condition_text,instruction_text,priority
     FROM alliance_prompt_rules
     WHERE active=TRUE AND job IN ('all',$1) AND channel IN ('all',$2)
       AND (audience IS NULL OR audience=$3)
     ORDER BY priority,id`,
    [job, channel, audience || null]
  );
  if (!result.rowCount) return 'No additional administrator rules are configured.';
  return result.rows.map((rule, index) => {
    const condition = rule.condition_text ? ` Apply when: ${rule.condition_text}` : ' Apply generally.';
    return `${index + 1}. ${rule.name}:${condition} Instruction: ${rule.instruction_text}`;
  }).join('\n');
}

module.exports = { getAlliancePromptRules };
