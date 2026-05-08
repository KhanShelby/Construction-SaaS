// src/components/upload/DataPreview.tsx
interface Props {
  headers: string[]
  rows: unknown[][]
}

export function DataPreview({ headers, rows }: Props) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">ตัวอย่างข้อมูล (10 แถวแรก)</p>
      </div>
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-zinc-400 font-medium whitespace-nowrap border-b border-zinc-800"
                >
                  {h || `คอลัมน์ ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-zinc-300 whitespace-nowrap max-w-48 truncate">
                    {String(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
