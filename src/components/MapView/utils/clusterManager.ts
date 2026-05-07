import maplibregl from "maplibre-gl"
import type { Cafe } from "../../../lib/dataClient"

// クラスター情報の型定義
export interface CafeCluster {
  id: string
  lng: number
  lat: number
  cafes: Cafe[]
  count: number
}

// 距離計算（メートル単位）
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ズームレベルに応じたクラスター距離の計算
const getClusterDistance = (zoom: number): number => {
  // ズームレベルが低いほど大きな距離でクラスタリング
  if (zoom <= 10) return 5000  // 5km
  if (zoom <= 12) return 2000  // 2km
  if (zoom <= 14) return 1000  // 1km
  return 500  // 500m
}

// カフェをクラスターにグループ化（空間バケット法でO(N)に近い計算量）
export const createCafeClusters = (cafes: Cafe[], zoom: number): CafeCluster[] => {
  const clusterDistance = getClusterDistance(zoom)
  // 1度あたりおよそ111km。クラスタ距離をバケットサイズ（度）に換算
  const bucketSizeDeg = clusterDistance / 111000

  // IDでソートして決定的な結果を得る（既存挙動に合わせる）
  const sortedCafes = [...cafes].sort((a, b) => a.id.localeCompare(b.id))

  // バケットマップ構築: "latIdx,lngIdx" → カフェ配列
  const buckets = new Map<string, Cafe[]>()
  const bucketKey = (lat: number, lng: number) =>
    `${Math.floor(lat / bucketSizeDeg)},${Math.floor(lng / bucketSizeDeg)}`

  for (const cafe of sortedCafes) {
    const key = bucketKey(cafe.lat, cafe.lng)
    let arr = buckets.get(key)
    if (!arr) {
      arr = []
      buckets.set(key, arr)
    }
    arr.push(cafe)
  }

  const clusters: CafeCluster[] = []
  const usedCafes = new Set<string>()

  for (const cafe of sortedCafes) {
    if (usedCafes.has(cafe.id)) continue

    const latBucket = Math.floor(cafe.lat / bucketSizeDeg)
    const lngBucket = Math.floor(cafe.lng / bucketSizeDeg)

    // 自バケットと隣接8バケットだけを候補にする（距離計算 O(1) 平均）
    const clusterCafes: Cafe[] = [cafe]
    usedCafes.add(cafe.id)

    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const neighbors = buckets.get(`${latBucket + di},${lngBucket + dj}`)
        if (!neighbors) continue
        for (const other of neighbors) {
          if (usedCafes.has(other.id)) continue
          const distance = calculateDistance(cafe.lat, cafe.lng, other.lat, other.lng)
          if (distance <= clusterDistance) {
            clusterCafes.push(other)
            usedCafes.add(other.id)
          }
        }
      }
    }

    // 代表点は最小IDのカフェ（既存挙動と一致）
    clusterCafes.sort((a, b) => a.id.localeCompare(b.id))
    const representativeCafe = clusterCafes[0]

    clusters.push({
      id: `cluster-${representativeCafe.id}`,
      lng: representativeCafe.lng,
      lat: representativeCafe.lat,
      cafes: clusterCafes,
      count: clusterCafes.length
    })
  }

  return clusters
}

// クラスターマーカーの要素を作成
export const createClusterMarkerElement = (cluster: CafeCluster): HTMLElement => {
  const el = document.createElement('div')

  // カフェ数に応じてサイズを調整
  const size = Math.min(60, Math.max(30, cluster.count * 8))

  el.className = 'cluster-marker'
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.style.fontSize = `${Math.min(16, size * 0.3)}px`

  el.textContent = cluster.count.toString()

  return el
}

// クラスターのクリック/カーソルハンドラはマップごとに1度だけ登録する
type ClusterCtx = {
  allCafes: Cafe[]
  setSelected: (cafe: Cafe) => void
}
const clusterContexts = new WeakMap<maplibregl.Map, ClusterCtx>()
const clusterHandlersRegistered = new WeakSet<maplibregl.Map>()

const ensureClusterHandlers = (map: maplibregl.Map) => {
  if (clusterHandlersRegistered.has(map)) return
  clusterHandlersRegistered.add(map)

  map.on('click', 'clusters', (e) => {
    if (!e.features || e.features.length === 0) return
    const ctx = clusterContexts.get(map)
    if (!ctx) return

    const feature = e.features[0]
    const properties = feature.properties
    if (feature.geometry.type !== 'Point') return

    const coordinates = feature.geometry.coordinates as [number, number]
    const currentZoom = map.getZoom()

    map.flyTo({
      center: coordinates,
      zoom: Math.min(currentZoom + 2, 18)
    })

    if (properties?.count === 1) {
      const currentClusters = createCafeClusters(ctx.allCafes, currentZoom)
      const cluster = currentClusters.find(c => c.id === properties.id)
      if (cluster && cluster.cafes.length > 0) {
        ctx.setSelected(cluster.cafes[0])
      }
    }
  })

  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = ''
  })
}

// クラスターマーカーを更新する関数
export const updateClusterMarkers = (
  zoom: number,
  map: maplibregl.Map | null,
  cafeDataLoaded: boolean,
  allCafes: Cafe[],
  ZOOM_THRESHOLD: number,
  setSelected: (cafe: Cafe) => void
) => {
  if (!map || !cafeDataLoaded) return

  // 最新のコンテキストを保持（ハンドラから参照される）
  clusterContexts.set(map, { allCafes, setSelected })

  // ズームレベルが閾値以下の場合はクラスターレイヤーを表示
  if (zoom <= ZOOM_THRESHOLD) {
    const clusters = createCafeClusters(allCafes, zoom)

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: clusters.map(cluster => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [cluster.lng, cluster.lat]
        },
        properties: {
          id: cluster.id,
          count: cluster.count,
          cafes: cluster.cafes
        }
      }))
    }

    if (map.getSource('clusters')) {
      const source = map.getSource('clusters') as maplibregl.GeoJSONSource
      source.setData(geojsonData)
    } else {
      map.addSource('clusters', {
        type: 'geojson',
        data: geojsonData
      })

      // クラスターの円を描画
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'clusters',
        paint: {
          'circle-color': '#70513C',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 15,
            10, 25,
            50, 35
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      })

      // クラスターの数字ラベルを描画
      map.addLayer({
        id: 'cluster-labels',
        type: 'symbol',
        source: 'clusters',
        layout: {
          'text-field': ['get', 'count'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 14
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      ensureClusterHandlers(map)
    }

    return
  }

  // ズームレベルが閾値以上の場合は既存のクラスターレイヤーを削除
  if (map.getLayer('clusters')) {
    map.removeLayer('clusters')
  }
  if (map.getLayer('cluster-labels')) {
    map.removeLayer('cluster-labels')
  }
  if (map.getSource('clusters')) {
    map.removeSource('clusters')
  }
}
