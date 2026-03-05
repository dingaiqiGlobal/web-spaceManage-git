/*
 * @Author: dys
 * @Date: 2025-09-08 10:20:04
 * @LastEditors: dys
 * @LastEditTime: 2025-10-15 15:41:31
 * @Descripttion: 障碍物模型
 */
import BaseLayer from "./BaseLayer";
import * as Cesium from 'cesium'
class ModelLayer extends BaseLayer {
	constructor(options) {
		super(options);
		this.text = this.options.text;
		this.height=this.options.height;
		this.eyeOffset=this.options.eyeOffset;
		this.lineColor=this.options.lineColor;
		this.url = this.options.url ? this.options.url : "";
		this.scale = this.options.scale ? this.options.scale : 1
		this.position = this.options.position || {
			lng: 116.142312,
			lat: 40.119501,
			height: 0,
		};

		if (this.url === null || this.url === "") {
			console.log("gltf模型地址不可为空!");
			return;
		}
		this.createLayer(this.options);
	}
	createLayer(options) {
		let position = Cesium.Cartesian3.fromDegrees(
			this.position.lng,
			this.position.lat,
			this.position.height
		);
		let heading = Cesium.Math.toRadians(0);
		let roll = 0;
		let pitch = 0;
		let hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
		let orientation = Cesium.Transforms.headingPitchRollQuaternion(
			position,
			hpr
		);

		let positionHeight = Cesium.Cartesian3.fromDegrees(
			this.position.lng,
			this.position.lat,
			this.position.height + this.height
		);

		this.modelEntity = new Cesium.Entity({
			type: "Model",
			name: "Model",
			position: position,
			orientation: orientation,
			model: {
				uri: this.url,
				show: this.show,
				scale: this.scale,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
			},
			label: {
				text: this.text,
				font: "12px sans-serif",
				// fillColor:this.lineColor,
				showBackground: true,
				backgroundColor:Cesium.Color.fromCssColorString("rgba(254, 254, 254, 0)"),
				eyeOffset: this.eyeOffset,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
			},
			// polyline: {
			// 	positions: [position, positionHeight],
			// 	width: 2,
			// 	material: this.lineColor,
			// },
		});
	}

	addTo(viewer) {
		super.addTo(viewer);
		this.viewer.entities.add(this.modelEntity);
		return this;
	}

	remove() {
		if (this.viewer) {
			this.viewer.entities.remove(this.modelEntity);
			super.remove(this.viewer);
		}
		return this;
	}
	setVisible(flag) {
		super.setVisible(flag);
		//this.dataSource.show = flag;
		this.modelEntity.show = flag;
		return this;
	}
}
export default ModelLayer;
