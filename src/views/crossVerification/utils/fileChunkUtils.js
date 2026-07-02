export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const BINARY_CHUNK_SIZE = 64 * 1024
export const TEXT_FILE_PATTERN = /\.(txt|csv|json|xml|log|md)$/i

export function isTextFile(fileName) {
  return TEXT_FILE_PATTERN.test(String(fileName || ''))
}

export function formatBytes(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`
  return `${(size / 1024 / 1024).toFixed(1)} MiB`
}

export function bytesToBase64(bytes) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 8192))
  }
  return btoa(binary)
}

export function splitTextToBlocks(text) {
  return String(text || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean)
}

export function splitBytesToBlocks(bytes) {
  const blocks = []
  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
    blocks.push(bytesToBase64(bytes.subarray(offset, offset + BINARY_CHUNK_SIZE)))
  }
  return blocks
}

export function readFileAsChunks(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('请选择文件'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('文件不能超过10 MiB'))
      return
    }

    const reader = new FileReader()
    const textFile = isTextFile(file.name)

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.onload = event => {
      const blocks = textFile
        ? splitTextToBlocks(event.target.result)
        : splitBytesToBlocks(new Uint8Array(event.target.result))

      if (!blocks.length) {
        reject(new Error('文件中没有可用数据'))
        return
      }

      resolve({
        blocks,
        fileName: file.name,
        size: file.size,
        fileInfo: `${file.name}，${blocks.length}个数据块，${formatBytes(file.size)}`
      })
    }

    if (textFile) {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}
