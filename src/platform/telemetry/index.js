const metricStore = {
  counters: {},
  gauges: {},
  histograms: {},
}

export const metrics = {
  increment(name, value = 1) {
    metricStore.counters[name] = (metricStore.counters[name] || 0) + value
  },
  gauge(name, value) {
    metricStore.gauges[name] = value
  },
  observe(name, value) {
    metricStore.histograms[name] = metricStore.histograms[name] || []
    metricStore.histograms[name].push(value)
  },
  getSnapshot() {
    return structuredClone(metricStore)
  },
}