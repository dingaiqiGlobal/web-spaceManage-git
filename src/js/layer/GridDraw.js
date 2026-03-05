/*
 * @Author: dys
 * @Date: 2025-09-08 10:20:04
 * @LastEditors: dys
 * @LastEditTime: 2026-01-23 13:45:40
 * @Descripttion: Geojson网格
 */
import BaseLayer from "./BaseLayer";
import * as Cesium from 'cesium'

class GridDraw extends BaseLayer {
	constructor(options) {
		super(options);
		this.url = options.url || "";
		this.name = options.name || "";
		this.Type = options.Type || "";
		this.polygonColor = options.polygonColor || "";
		this.dataSource = null;
		this.fillColor = options.fillColor || "rgba(60, 247, 3, 0.02)";
		this.outlineColor = options.outlineColor || "rgba(60, 247, 3, 0.1)";
		this.popups = new Map(); // 存储气泡框实例
		this.popup = null;
		this.createLayer();
	}
	createLayer() {
		this.dataSource = new Cesium.GeoJsonDataSource(this.name);
		const grid = this.dataSource.load(this.url);
		grid.then((dataSource) => {
			const entities = dataSource.entities.values;
			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i];
				const { agl, gridHeight, zoneType, altitude } =
					entity.properties;
				entity.Type = this.Type;
				entity.name = this.name;
				entity.polygon.height = agl.getValue();
				entity.polygon.extrudedHeight =
					gridHeight.getValue() + agl.getValue();
				entity.polygon.fill = true;
				entity.polygon.material = new Cesium.ColorMaterialProperty(
					Cesium.Color.fromCssColorString(this.fillColor)
				);
				entity.polygon.outline = true;
				entity.polygon.outlineWidth = 1;
				entity.polygon.outlineColor = Cesium.Color.fromCssColorString(
					this.outlineColor
				);
				// const entity = entities[i];
				// const { gridId, height, floor } = entity.properties;
				// entity.Type = this.Type;
				// entity.gridId = gridId;
				// entity.name = this.name;
				// entity.polygon.height = height.getValue();
				// entity.polygon.extrudedHeight =
				// 	floor.getValue() + height.getValue();
				// entity.polygon.fill = true;
				// entity.polygon.material = new Cesium.ColorMaterialProperty(
				// 	Cesium.Color.fromCssColorString(this.fillColor)
				// );
				// entity.polygon.outline = true;
				// entity.polygon.outlineColor = Cesium.Color.fromCssColorString(
				// 	this.outlineColor
				// );
				// entity.polygon.outlineWidth = 1;
			}
		});
	}
	addTo(viewer) {
		super.addTo(viewer);
		this.viewer.dataSources.add(this.dataSource);
		return this;
	}
	remove() {
		if (this.viewer) {
			this.viewer.dataSources.remove(this.dataSource);
			super.remove(this.viewer);
		}
		return this;
	}
	setVisible(flag) {
		super.setVisible(flag);
		this.dataSource.show = flag;
		return this;
	}
	addEventListener(eventType, handler) {
		this.dataSource.evt = new Cesium.Event();
		this.dataSource.evt.addEventListener(handler, this);
		return this;
	}
}
export default GridDraw;
