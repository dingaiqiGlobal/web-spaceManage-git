/*
 * @Author: dys
 * @Date: 2025-09-15 11:04:37
 * @LastEditors: dys
 * @LastEditTime: 2025-11-05 15:46:27
 * @Descripttion:
 */
/**
 * 图上标绘
 */
import * as Cesium from 'cesium'
import EntityDraw from './EntityDraw'
import EntityEdit from './EntityEdit'
import bus from '@/utils/bus.js'
import { coordinatesToWKT } from '../coords/CoordinateToWKT'

let MapPlotting = {
  init(viewer) {
    this.viewer = viewer
    this.draw = null
    this.initDrawTool()
  },
  //初始化绘制工具
  initDrawTool() {
    this.edit = new EntityEdit(this.viewer)
    this.edit.activate()
    // this.edit.EditEndEvent.addEventListener((result) => {
    // 	console.log(result, "目标编辑结束后");
    // });
    this.draw = new EntityDraw(this.viewer)
    this.draw.DrawEndEvent.addEventListener((result, positions, drawType) => {
      result.remove()
      this.addDrawResult(positions, drawType)
      // 发送坐标数组
      bus.emit('drawZoneData', this.emitParams(positions))
      // 发送WKT格式数据
      const wktString = coordinatesToWKT(positions, drawType, false)
      if (wktString) {
        bus.emit('drawZoneWKT', wktString)
      }
    })
  },
  //激活绘制工具
  drawActivate(type) {
    this.draw.activate(type)
    this.viewer.scene.globe.depthTestAgainstTerrain = false //深度检测
  },
  //清空所有绘制
  clearDraw() {
    let entities = this.viewer.entities.values
    let delEntities = entities.filter((item) => item.Type && item.Type.includes('Editable'))
    for (let i = 0; i < delEntities.length; i++) {
      this.viewer.entities.remove(delEntities[i])
    }
  },
  //添加绘制结果
  addDrawResult(positions, drawType) {
    switch (drawType) {
      case 'Point':
        this.generatePoint(positions)
        break
      case 'Polyline':
        this.generatePolyline(positions)
        break
      case 'Polygon':
        this.generatePolygon(positions)
        break
    }
  },
  emitParams(positions) {
    const params = []
    for (let i = 0; i < positions.length; i++) {
      const cartographic = Cesium.Cartographic.fromCartesian(positions[i])
      let lng = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
      let lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
      params.push({
        longitude: lng, //经度
        latitude: lat, //纬度
        sortOrder: i, //排序序号（确定坐标点顺序）
      })
    }
    return params
  },
  generatePoint(positions) {
    this.viewer.entities.add({
      Type: 'EditableMarker',
      position: positions[0],
      billboard: {
        image: require('@/assets/img/draw/point.png'),
        scale: 0.8,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: 50000,
      },
    })
  },
  generatePolyline(positions) {
    this.viewer.entities.add({
      Type: 'EditablePolyline',
      polyline: {
        positions: positions,
        width: 2,
        material: Cesium.Color.fromCssColorString('rgba(78, 143, 252, 1)'),
        disableDepthTestDistance: 50000,
      },
    })
  },
  generatePolygon(positions) {
    this.viewer.entities.add({
      Type: 'EditablePolygon',
      polygon: {
        hierarchy: positions,
        material: Cesium.Color.fromCssColorString('rgba(78, 143, 252, 0.4)'),
        perPositionHeight: true,
        disableDepthTestDistance: 50000,
      },
      polyline: {
        positions: positions.concat(positions[0]),
        width: 1,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('rgba(141, 248, 253, 1)'),
        }),
        disableDepthTestDistance: 50000,
      },
    })
  },
}
export default MapPlotting
