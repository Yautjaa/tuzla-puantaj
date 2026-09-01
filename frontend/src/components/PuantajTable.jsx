import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import PersonelEditor from './PersonelEditor'

export default function PuantajTable({ puantajData, onPersonelUpdate }) {
  const { ay_gun_sayisi, personeller } = puantajData

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'sira',
        header: '#',
        cell: info => (
          <span className="text-[11px] font-medium text-slate-300 tabular-nums">{info.row.index + 1}</span>
        ),
        size: 24,
      },
      {
        id: 'ad_soyad',
        header: 'Personel',
        accessorKey: 'ad_soyad',
        cell: info => (
          <span className="font-semibold text-slate-700 text-[11px] whitespace-nowrap truncate block w-full">{info.getValue()}</span>
        ),
        size: 140,
      },
      {
        id: 'izin_gunu',
        header: 'İzin',
        accessorKey: 'izin_gunu',
        cell: info => (
          <PersonelEditor
            personel={info.row.original._personel}
            onUpdate={onPersonelUpdate}
          />
        ),
        size: 40,
      },
    ]

    for (let gun = 1; gun <= ay_gun_sayisi; gun++) {
      const g = String(gun)
      cols.push({
        id: `gun_${g}`,
        header: String(gun),
        accessorFn: row => row.gunler[g],
        cell: info => {
          const val = info.getValue()
          if (!val) return null

          if (val === 'HT') {
            return (
              <div className="flex items-center justify-center">
                <span className="w-5 h-[18px] flex items-center justify-center rounded bg-rose-100 text-rose-600 text-[8px] font-bold leading-none">
                  HT
                </span>
              </div>
            )
          }

          return (
            <span className="text-[11px] text-slate-300 select-none">×</span>
          )
        },
        size: 24,
      })
    }

    return cols
  }, [ay_gun_sayisi, onPersonelUpdate])

  const data = useMemo(
    () => personeller.map(p => ({ ...p, _personel: p })),
    [personeller],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="bg-white rounded-2xl border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.025)] overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-310px)]">
        <table className="w-full border-collapse relative text-sm">
          <thead className="sticky top-0 z-20 bg-[#fafafa]">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize(), minWidth: header.getSize() }}
                    className="px-1 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap border-b border-black/[0.04]"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: Math.min(index, 15) * 0.02 }}
                className="border-b border-black/[0.02] last:border-b-0 hover:bg-indigo-50/40 transition-colors group"
              >
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className={`px-1 py-[7px] text-center ${idx === 0 ? 'text-center' : ''} ${idx === 1 ? 'text-left pl-3' : ''}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
