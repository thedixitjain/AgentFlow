import { DatasetInfo, QueryResult } from './types'

export class DataIntelligenceAgent {
  private datasets: Map<string, Array<Record<string, unknown>>> = new Map()
  private datasetInfo: Map<string, DatasetInfo> = new Map()

  loadData(data: Array<Record<string, unknown>>, name: string): DatasetInfo {
    this.datasets.set(name, data)
    
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    const numericColumns = columns.filter(col => 
      data.some(row => typeof row[col] === 'number')
    )
    const categoricalColumns = columns.filter(col => 
      data.some(row => typeof row[col] === 'string')
    )

    const info: DatasetInfo = {
      name,
      rows: data.length,
      columns,
      numericColumns,
      categoricalColumns,
      preview: data.slice(0, 5),
    }

    this.datasetInfo.set(name, info)
    return info
  }

  processQuery(query: string, datasetName?: string): QueryResult {
    const name = datasetName || Array.from(this.datasets.keys())[0]
    const data = this.datasets.get(name)
    
    if (!data || data.length === 0) {
      return {
        success: false,
        agent: 'data',
        message: 'No dataset loaded. Please upload a CSV or Excel file first.',
        error: 'No data available',
      }
    }

    const queryLower = query.toLowerCase()
    const info = this.datasetInfo.get(name)!

    try {
      // Aggregation queries
      if (this.matchesPattern(queryLower, ['total', 'sum'])) {
        return this.handleAggregation(data, info, 'sum', query)
      }
      if (this.matchesPattern(queryLower, ['average', 'mean', 'avg'])) {
        return this.handleAggregation(data, info, 'mean', query)
      }
      if (this.matchesPattern(queryLower, ['maximum', 'max', 'highest'])) {
        return this.handleAggregation(data, info, 'max', query)
      }
      if (this.matchesPattern(queryLower, ['minimum', 'min', 'lowest'])) {
        return this.handleAggregation(data, info, 'min', query)
      }

      // Visualization queries
      if (this.matchesPattern(queryLower, ['plot', 'chart', 'graph', 'visualize', 'show'])) {
        return this.handleVisualization(data, info, query)
      }

      // Ranking queries
      if (this.matchesPattern(queryLower, ['top', 'bottom', 'rank', 'best', 'worst'])) {
        return this.handleRanking(data, info, query)
      }

      // Count queries
      if (this.matchesPattern(queryLower, ['count', 'how many', 'number of'])) {
        return this.handleCount(data, info, query)
      }

      // Default: show dataset summary
      return this.handleSummary(data, info)
    } catch (error) {
      return {
        success: false,
        agent: 'data',
        message: `Error processing query: ${error}`,
        error: String(error),
      }
    }
  }

  private matchesPattern(query: string, patterns: string[]): boolean {
    return patterns.some(p => query.includes(p))
  }

  private findColumn(query: string, columns: string[]): string | null {
    const queryLower = query.toLowerCase()
    return columns.find(col => queryLower.includes(col.toLowerCase())) || null
  }

  private handleAggregation(
    data: Array<Record<string, unknown>>,
    info: DatasetInfo,
    operation: 'sum' | 'mean' | 'max' | 'min',
    query: string
  ): QueryResult {
    const targetCol = this.findColumn(query, info.numericColumns) || info.numericColumns[0]
    
    if (!targetCol) {
      return {
        success: false,
        agent: 'data',
        message: 'No numeric columns found for aggregation.',
      }
    }

    const values = data.map(row => Number(row[targetCol])).filter(v => !isNaN(v))
    let result: number

    switch (operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0)
        break
      case 'mean':
        result = values.reduce((a, b) => a + b, 0) / values.length
        break
      case 'max':
        result = Math.max(...values)
        break
      case 'min':
        result = Math.min(...values)
        break
    }

    const opName = operation === 'mean' ? 'average' : operation
    return {
      success: true,
      agent: 'data',
      message: `The ${opName} of **${targetCol}** is **${result.toLocaleString('en-US', { maximumFractionDigits: 2 })}**`,
      data: { [targetCol]: result, operation },
    }
  }

  private handleVisualization(
    data: Array<Record<string, unknown>>,
    info: DatasetInfo,
    query: string
  ): QueryResult {
    const queryLower = query.toLowerCase()
    
    // Determine chart type
    let chartType: 'bar' | 'line' | 'pie' = 'bar'
    if (queryLower.includes('line') || queryLower.includes('trend')) chartType = 'line'
    if (queryLower.includes('pie')) chartType = 'pie'

    // Find columns
    const xCol = this.findColumn(query, info.categoricalColumns) || info.categoricalColumns[0]
    const yCol = this.findColumn(query, info.numericColumns) || info.numericColumns[0]

    if (!xCol || !yCol) {
      return {
        success: false,
        agent: 'data',
        message: 'Could not determine appropriate columns for visualization.',
      }
    }

    // Aggregate data by category
    const aggregated = new Map<string, number>()
    data.forEach(row => {
      const key = String(row[xCol])
      const val = Number(row[yCol]) || 0
      aggregated.set(key, (aggregated.get(key) || 0) + val)
    })

    const chartData = Array.from(aggregated.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return {
      success: true,
      agent: 'data',
      message: `Here's the ${chartType} chart showing **${yCol}** by **${xCol}**:`,
      chart: {
        type: chartType,
        data: chartData,
        xKey: 'name',
        yKey: 'value',
        title: `${yCol} by ${xCol}`,
      },
    }
  }

  private handleRanking(
    data: Array<Record<string, unknown>>,
    info: DatasetInfo,
    query: string
  ): QueryResult {
    const queryLower = query.toLowerCase()
    const numMatch = query.match(/\d+/)
    const n = numMatch ? parseInt(numMatch[0]) : 5
    const ascending = queryLower.includes('bottom') || queryLower.includes('lowest') || queryLower.includes('worst')

    const yCol = this.findColumn(query, info.numericColumns) || info.numericColumns[0]
    const xCol = info.categoricalColumns[0] || info.columns[0]

    if (!yCol) {
      return {
        success: false,
        agent: 'data',
        message: 'No numeric column found for ranking.',
      }
    }

    // Aggregate and sort
    const aggregated = new Map<string, number>()
    data.forEach(row => {
      const key = String(row[xCol])
      const val = Number(row[yCol]) || 0
      aggregated.set(key, (aggregated.get(key) || 0) + val)
    })

    const sorted = Array.from(aggregated.entries())
      .sort((a, b) => ascending ? a[1] - b[1] : b[1] - a[1])
      .slice(0, n)

    const direction = ascending ? 'Bottom' : 'Top'
    const resultData = sorted.map(([name, value], i) => ({
      rank: i + 1,
      [xCol]: name,
      [yCol]: value,
    }))

    return {
      success: true,
      agent: 'data',
      message: `**${direction} ${n} by ${yCol}:**`,
      data: { results: resultData },
      chart: {
        type: 'bar',
        data: sorted.map(([name, value]) => ({ name, value })),
        xKey: 'name',
        yKey: 'value',
        title: `${direction} ${n} by ${yCol}`,
      },
    }
  }

  private handleCount(
    data: Array<Record<string, unknown>>,
    info: DatasetInfo,
    _query: string
  ): QueryResult {
    return {
      success: true,
      agent: 'data',
      message: `The dataset contains **${data.length.toLocaleString()}** records across **${info.columns.length}** columns.`,
      data: { totalRecords: data.length, columns: info.columns.length },
    }
  }

  private handleSummary(
    data: Array<Record<string, unknown>>,
    info: DatasetInfo
  ): QueryResult {
    const summary: Record<string, unknown> = {}
    
    info.numericColumns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v))
      summary[col] = {
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      }
    })

    return {
      success: true,
      agent: 'data',
      message: `**Dataset Summary:**\n- **Records:** ${data.length}\n- **Columns:** ${info.columns.join(', ')}\n\nTry asking specific questions like "What is the total revenue?" or "Plot sales by category"`,
      data: summary,
    }
  }

  getDatasets(): string[] {
    return Array.from(this.datasets.keys())
  }

  getDatasetInfo(name: string): DatasetInfo | undefined {
    return this.datasetInfo.get(name)
  }

  clearData(): void {
    this.datasets.clear()
    this.datasetInfo.clear()
  }
}
