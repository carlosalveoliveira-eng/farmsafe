import type { MapArea } from '../../types/map'

type Point = [number, number]

function pointInRing(point: Point, ring: any[]) {
  const [lat, lng] = point
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]
    const previous = ring[j]

    if (!Array.isArray(current) || !Array.isArray(previous)) continue

    const xi = Number(current[0])
    const yi = Number(current[1])
    const xj = Number(previous[0])
    const yj = Number(previous[1])

    if (![xi, yi, xj, yj].every(Number.isFinite)) continue

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi

    if (intersects) inside = !inside
  }

  return inside
}

function pointInPolygon(point: Point, polygon: any[]) {
  const outerRing = polygon?.[0]

  if (!Array.isArray(outerRing) || outerRing.length < 4) return false
  if (!pointInRing(point, outerRing)) return false

  const holes = polygon.slice(1)

  return !holes.some((hole) => Array.isArray(hole) && pointInRing(point, hole))
}

export function findAreaContainingPoint(
  point: Point,
  areas: MapArea[],
  acceptedTypes = ['pasto', 'retiro', 'fazenda']
) {
  return (
    areas.find((area) => {
      if (!acceptedTypes.includes(area.tipo)) return false

      const geometry = area.geojson?.geometry

      if (geometry?.type === 'Polygon') {
        return pointInPolygon(point, geometry.coordinates)
      }

      if (geometry?.type === 'MultiPolygon') {
        return geometry.coordinates?.some((polygon: any[]) =>
          pointInPolygon(point, polygon)
        )
      }

      return false
    }) ?? null
  )
}
