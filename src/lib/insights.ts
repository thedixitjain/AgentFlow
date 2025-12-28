import { DocumentFile, DocumentInsight } from './types'

export function generateInsights(doc: DocumentFile): DocumentInsight[] {
  const insights: DocumentInsight[] = []

  if (!doc.data || doc.data.length === 0) return insights

  // Total rows
  insights.push({
    type: 'metric',
    title: 'Total Records',
    value: doc.data.length.toLocaleString(),
    description: 'Number of rows in dataset',
  })

  // Find numeric columns
  const numericColumns = doc.columns?.filter(col =>
    doc.data?.some(row => typeof row[col] === 'number')
  ) || []

  // Calculate metrics for first numeric column
  if (numericColumns.length > 0) {
    const col = numericColumns[0]
    const values = doc.data
      .map(row => Number(row[col]))
      .filter(v => !isNaN(v))

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)
      const min = Math.min(...values)

      insights.push({
        type: 'metric',
        title: `Average ${col}`,
        value: avg.toFixed(2),
        description: `Range: ${min.toFixed(2)} - ${max.toFixed(2)}`,
      })

      insights.push({
        type: 'metric',
        title: `Total ${col}`,
        value: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      })
    }
  }

  // Generate chart data for categorical column
  const categoricalColumns = doc.columns?.filter(col =>
    doc.data?.some(row => typeof row[col] === 'string')
  ) || []

  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    const catCol = categoricalColumns[0]
    const numCol = numericColumns[0]

    const aggregated = new Map<string, number>()
    doc.data.forEach(row => {
      const key = String(row[catCol])
      const val = Number(row[numCol]) || 0
      aggregated.set(key, (aggregated.get(key) || 0) + val)
    })

    const chartData = Array.from(aggregated.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    if (chartData.length > 0) {
      insights.push({
        type: 'chart',
        title: `${numCol} by ${catCol}`,
        data: chartData,
        description: `Top ${chartData.length} categories`,
      })
    }
  }

  return insights
}
