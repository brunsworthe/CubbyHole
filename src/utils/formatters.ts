export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1000) {
    return `${Math.round(mb)} MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}
