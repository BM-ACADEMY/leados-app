const fs = require('fs');

let code = fs.readFileSync('src/views/InboxView.jsx', 'utf8');

// 1. Update destructuring
code = code.replace(
  'const { leads, loading: loadingLeads, refetch: refetchLeadsList } = useLeads({ search });',
  'const { leads, loading: loadingLeads, hasMore: hasMoreLeads, loadingMore: loadingMoreLeads, loadMoreLeads, refetch: refetchLeadsList } = useLeads({ search });'
);

// 2. Replace the mapping logic
const mapStart = '{displayLeads.map((l) => (';
const mapEnd = '          ))}';

let mapStartIndex = code.indexOf(mapStart);
let mapEndIndex = code.indexOf(mapEnd) + mapEnd.length;

if (mapStartIndex !== -1 && mapEndIndex !== -1) {
  let mappedBlock = code.substring(mapStartIndex, mapEndIndex);
  
  // Extract the inner content of the map
  // It starts with '<div' and ends with '</div>\n          ))}'
  
  let returnStart = mappedBlock.indexOf('<div');
  let returnEnd = mappedBlock.lastIndexOf('</div>');
  
  let innerJSX = mappedBlock.substring(returnStart, returnEnd + 6);
  
  const virtuosoCode = `<Virtuoso
            style={{ flex: 1 }}
            data={displayLeads}
            endReached={() => {
              if (hasMoreLeads && !loadingMoreLeads) {
                loadMoreLeads();
              }
            }}
            components={{
              Footer: () => loadingMoreLeads ? <div style={{ padding: 10, textAlign: 'center', color: C.muted, fontSize: 11 }}>Loading more...</div> : null
            }}
            itemContent={(index, l) => (
              ${innerJSX}
            )}
          />`;
          
  code = code.substring(0, mapStartIndex) + virtuosoCode + code.substring(mapEndIndex);
  fs.writeFileSync('src/views/InboxView.jsx', code);
  console.log("Successfully replaced displayLeads map with Virtuoso");
} else {
  console.log("Could not find displayLeads map start or end");
}
