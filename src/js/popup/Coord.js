import * as Cesium from 'cesium'
export class Coord {
  viewer
  constructor(viewer) {
    this.viewer = viewer
  }

  cartesian2ToCartesian3(position) {
    const { viewer } = this
    let cartesian3 = null
    if (viewer && position) {
      const picks = this.viewer.scene.drillPick(position)
      let isOn3dtiles = false
      for (const i in picks) {
        // 为了防止别人用了Array.prototype扩展后出现bug
        if (!Number.isNaN(Number(i))) {
          const pick = picks[i]
          isOn3dtiles
            = (pick && pick.primitive instanceof Cesium.Cesium3DTileFeature)
            || (pick && pick.primitive instanceof Cesium.Cesium3DTileset)
            || (pick && pick.primitive instanceof Cesium.Model)
          if (isOn3dtiles) {
            viewer.scene.pick(position)
            cartesian3 = viewer.scene.pickPosition(position)
            if (cartesian3) {
              const cartographic
                = Cesium.Cartographic.fromCartesian(cartesian3)
              if (cartographic.height < 0)
                cartographic.height = 0
              const lon = Cesium.Math.toDegrees(cartographic.longitude)
              const lat = Cesium.Math.toDegrees(cartographic.latitude)
              const height = cartographic.height
              cartesian3 = this.lnglatToCartesian3(lon, lat, height)
              return cartesian3
            }
          }
        }
      }

      // 不在模型上
      if (!isOn3dtiles) {
        const isTerrain = viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider // 是否存在地形
        if (!isTerrain) {
          // 无地形
          const ray = viewer.scene.camera.getPickRay(position)
          if (!ray)
            return null
          cartesian3 = viewer.scene.globe.pick(ray, viewer.scene)
          return cartesian3
        }
        else {
          cartesian3 = viewer.scene.camera.pickEllipsoid(
            position,
            viewer.scene.globe.ellipsoid,
          )
          if (cartesian3) {
            const position = this.cartesian3ToLngLat(cartesian3)
            if (position && position.height < 0) {
              cartesian3 = this.lnglatToCartesian3(
                position.longitude,
                position.latitude,
                0.1,
              )
            }
            return cartesian3
          }
        }
      }
    }
    return cartesian3
  }

  cartesian2ToLnglat(position) {
    const cartesian3 = this.cartesian2ToCartesian3(position)
    const lnglat = this.cartesian3ToLngLat(cartesian3)
    return lnglat
  }

  cartesian3ToCartesian2(cartesian3) {
    return Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      this.viewer.scene,
      cartesian3,
    )
  }

  computeViewerBounds() {
    const extend = this.scene.camera.computeViewRectangle()
    let bounds = []
    if (typeof extend === 'undefined') {
      const coordToLonlat = (viewer, x, y) => {
        const { camera, scene } = viewer
        const d2 = new Cesium.Cartesian2(x, y)
        const ellipsoid = scene.globe.ellipsoid
        // 2D转3D世界坐标
        const d3 = camera.pickEllipsoid(d2, ellipsoid)
        if (d3) {
          // 3D世界坐标转弧度
          const upperLeftCartographic
                = scene.globe.ellipsoid.cartesianToCartographic(d3)
          // 弧度转经纬度
          const lon = Cesium.Math.toDegrees(upperLeftCartographic.longitude)
          const lat = Cesium.Math.toDegrees(upperLeftCartographic.latitude)
          return { lon, lat }
        }
      }
      const canvas = this.scene.canvas
      const upperLeftLonLat = coordToLonlat(this, 0, 0)
      const lowerRightLonLat = coordToLonlat(
        this,
        canvas.clientWidth,
        canvas.clientHeight,
      )
      if (
        upperLeftLonLat?.lon
            && upperLeftLonLat?.lat
            && lowerRightLonLat?.lon
            && lowerRightLonLat?.lat
      ) {
        bounds = [
          upperLeftLonLat.lon,
          upperLeftLonLat.lat,
          lowerRightLonLat.lon,
          lowerRightLonLat.lat,
        ]
      }
    }
    else {
      // 三维视图
      bounds = [
        Cesium.Math.toDegrees(extend.west),
        Cesium.Math.toDegrees(extend.south),
        Cesium.Math.toDegrees(extend.east),
        Cesium.Math.toDegrees(extend.north),
      ]
    }
    return bounds
  }

  isVisibleByBounds(position) {
    let visible = false
    const bounds = this.computeViewerBounds()
    if (bounds) {
      const lnglat = this.cartesian3ToLngLat(position)
      if (lnglat) {
        const lng = lnglat.longitude
        const lat = lnglat.latitude
        if (
          lng >= bounds[0]
              && lng <= bounds[2]
              && lat >= bounds[1]
              && lat <= bounds[3]
        )
          visible = true
      }
    }
    return visible
  }

  cartesian3ToLngLat(cartesian3) {
    if (cartesian3) {
      const radians = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian3)
      const latitude = Cesium.Math.toDegrees(radians.latitude) // 弧度转度
      const longitude = Cesium.Math.toDegrees(radians.longitude)
      const height = radians.height
      return { longitude, latitude, height }
    }
  }
}
