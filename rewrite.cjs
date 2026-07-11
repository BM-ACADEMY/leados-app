const fs = require('fs');

let code = fs.readFileSync('src/views/InboxView.jsx', 'utf8');

// Replace Loading components to have marginTop: 60
code = code.replace(
  /<p style={{ textAlign: 'center', color: C\.muted, fontSize: 11 }}>Loading conversation…<\/p>/,
  "<p style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 60 }}>Loading conversation…</p>"
);
code = code.replace(
  /<p style={{ textAlign: 'center', color: C\.muted, fontSize: 11 }}>No messages yet\. Start the conversation!<\/p>/,
  "<p style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 60 }}>No messages yet. Start the conversation!</p>"
);

// We need to replace the localMessages.filter(m => !deletedForMeIds.includes(m.id)).map((m, i) => { ... })
// with <Virtuoso ... />

const mapStart = '{localMessages.filter(m => !deletedForMeIds.includes(m.id)).map((m, i) => {';
const mapEnd = '          <div ref={bottomRef} />';

let mapStartIndex = code.indexOf(mapStart);
let mapEndIndex = code.indexOf(mapEnd) + mapEnd.length;

if (mapStartIndex !== -1 && mapEndIndex !== -1) {
  let mappedBlock = code.substring(mapStartIndex, mapEndIndex);
  
  // Extract the inner content of the map
  // It starts with 'return (' and ends with ');\n          })'
  
  let returnStart = mappedBlock.indexOf('return (');
  let returnEnd = mappedBlock.lastIndexOf(');');
  
  let innerJSX = mappedBlock.substring(returnStart + 'return ('.length, returnEnd);
  
  const virtuosoCode = `{localMessages.length > 0 && (
            <Virtuoso
              style={{ flex: 1 }}
              data={localMessages.filter(m => !deletedForMeIds.includes(m.id))}
              firstItemIndex={Math.max(0, 10000 - localMessages.length)}
              initialTopMostItemIndex={localMessages.length - 1}
              startReached={() => {
                if (hasMore && !loadingMore) {
                  loadMoreMessages();
                }
              }}
              components={{
                Header: () => loadingMore ? <div style={{ padding: 10, textAlign: 'center', color: C.muted, fontSize: 11 }}>Loading older messages...</div> : <div style={{ height: 60 }} />,
                Footer: () => <div style={{ height: 18 }} />
              }}
              itemContent={(i, m) => {
                const isLead = m.direction === 'inbound' || m.from === 'lead';
                const isAI = m.sender === 'ai' || m.from === 'ai';
                const isSending = m.id?.toString().startsWith('optimistic-');
                return (
                  <div style={{ padding: '0 18px', marginBottom: 11 }}>
                    ${innerJSX}
                  </div>
                );
              }}
              followOutput="smooth"
            />
          )}`;
          
  code = code.substring(0, mapStartIndex) + virtuosoCode + code.substring(mapEndIndex);
  fs.writeFileSync('src/views/InboxView.jsx', code);
  console.log("Successfully replaced map with Virtuoso");
} else {
  console.log("Could not find map start or end");
}
