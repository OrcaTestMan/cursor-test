export type YoutubeLink = { id: string; url: string }

const PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/g

export function youtubeLinks(text: string): YoutubeLink[] {
  const seen = new Set<string>()
  const items: YoutubeLink[] = []
  for (const match of text.matchAll(PATTERN)) {
    const id = match[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    items.push({ id, url: `https://www.youtube.com/watch?v=${id}` })
  }
  return items
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
