/*
 * @Author: dys
 * @Date: 2026-02-13
 * @Descripttion: 坐标转WKT格式工具
 */
import * as Cesium from 'cesium'

/**
 * 格式化数字保留6位小数
 * @param {Number} num - 需要格式化的数字
 * @returns {String} 格式化后的字符串
 */
function formatCoordinate(num) {
	return num?.toFixed(6) || "0.000000";
}

/**
 * 获取WKT类型前缀
 * @param {String} drawType - 绘制类型
 * @param {Boolean} includeHeight - 是否包含高度
 * @returns {String} WKT类型前缀
 */
function getWKTType(drawType, includeHeight) {
	const baseType = drawType.toUpperCase();
	return includeHeight ? `${baseType} Z` : baseType;
}

/**
 * 将Cesium坐标数组转换为WKT格式
 * @param {Array} positions - Cesium Cartesian3坐标数组
 * @param {String} drawType - 绘制类型: 'Point', 'Polyline', 'Polygon'
 * @param {Boolean} includeHeight - 是否包含高度，默认true
 * @returns {String} WKT格式字符串
 */
export function coordinatesToWKT(positions, drawType, includeHeight = true) {
	if (!positions || positions.length === 0) {
		console.warn("坐标数组为空");
		return null;
	}

	// 将Cartesian3坐标转换为经纬度（含高度）
	const coordinates = positions.map((position) => {
		const cartographic = Cesium.Cartographic.fromCartesian(position);
		const lng = Cesium.Math.toDegrees(cartographic.longitude);
		const lat = Cesium.Math.toDegrees(cartographic.latitude);
		const height = cartographic.height || 0; // 高度，默认0
		return { lng, lat, height };
	});

	switch (drawType) {
		case "Point":
			return pointToWKT(coordinates[0], includeHeight);
		case "Polyline":
			return polylineToWKT(coordinates, includeHeight);
		case "Polygon":
			return polygonToWKT(coordinates, includeHeight);
		default:
			console.warn(`不支持的绘制类型: ${drawType}`);
			return null;
	}
}

/**
 * 点转WKT格式
 * @param {Object} coord - {lng, lat, height}
 * @param {Boolean} includeHeight - 是否包含高度
 * @returns {String} POINT格式
 */
function pointToWKT(coord, includeHeight = true) {
	const typePrefix = getWKTType("Point", includeHeight);
	if (includeHeight) {
		return `${typePrefix} (${formatCoordinate(
			coord.lng
		)} ${formatCoordinate(coord.lat)} ${formatCoordinate(
			coord.height || 0
		)})`;
	}
	return `${typePrefix} (${formatCoordinate(coord.lng)} ${formatCoordinate(
		coord.lat
	)})`;
}

/**
 * 线转WKT格式
 * @param {Array} coords - [{lng, lat, height}, ...]
 * @param {Boolean} includeHeight - 是否包含高度
 * @returns {String} LINESTRING格式
 */
function polylineToWKT(coords, includeHeight = true) {
	const typePrefix = getWKTType("Linestring", includeHeight);
	const coordsStr = coords
		.map((c) => {
			if (includeHeight) {
				return `${formatCoordinate(c.lng)} ${formatCoordinate(
					c.lat
				)} ${formatCoordinate(c.height || 0)}`;
			}
			return `${formatCoordinate(c.lng)} ${formatCoordinate(c.lat)}`;
		})
		.join(", ");
	return `${typePrefix} (${coordsStr})`;
}

/**
 * 多边形转WKT格式
 * @param {Array} coords - [{lng, lat, height}, ...]
 * @param {Boolean} includeHeight - 是否包含高度
 * @returns {String} POLYGON格式
 */
function polygonToWKT(coords, includeHeight = true) {
	// 确保首尾坐标相同（闭合多边形）
	const firstCoord = coords[0];
	const lastCoord = coords[coords.length - 1];

	let closedCoords = [...coords];
	if (firstCoord.lng !== lastCoord.lng || firstCoord.lat !== lastCoord.lat) {
		closedCoords.push(firstCoord);
	}

	const typePrefix = getWKTType("Polygon", includeHeight);
	const coordsStr = closedCoords
		.map((c) => {
			if (includeHeight) {
				return `${formatCoordinate(c.lng)} ${formatCoordinate(
					c.lat
				)} ${formatCoordinate(c.height || 0)}`;
			}
			return `${formatCoordinate(c.lng)} ${formatCoordinate(c.lat)}`;
		})
		.join(", ");
	return `${typePrefix} ((${coordsStr}))`;
}

/**
 * 将经纬度坐标数组转换为WKT格式（不需要Cesium坐标）
 * @param {Array} coordinates - [{longitude, latitude, height}, ...] 或 [{lng, lat, height}, ...]
 * @param {String} drawType - 绘制类型: 'Point', 'Polyline', 'Polygon'
 * @param {Boolean} includeHeight - 是否包含高度，默认true
 * @returns {String} WKT格式字符串
 */
export function lngLatArrayToWKT(coordinates, drawType, includeHeight = true) {
	if (!coordinates || coordinates.length === 0) {
		console.warn("坐标数组为空");
		return null;
	}

	// 标准化坐标格式
	const normalizedCoords = coordinates.map((coord) => ({
		lng: coord.longitude || coord.lng,
		lat: coord.latitude || coord.lat,
		height: coord.height || 0,
	}));

	switch (drawType) {
		case "Point":
			return pointToWKT(normalizedCoords[0], includeHeight);
		case "Polyline":
			return polylineToWKT(normalizedCoords, includeHeight);
		case "Polygon":
			return polygonToWKT(normalizedCoords, includeHeight);
		default:
			console.warn(`不支持的绘制类型: ${drawType}`);
			return null;
	}
}

/**
 * WKT转经纬度坐标数组
 * @param {String} wktString - WKT格式字符串（支持2D和3D）
 * @returns {Object} {type: String, coordinates: Array, hasHeight: Boolean}
 */
export function wktToCoordinates(wktString) {
	if (!wktString || typeof wktString !== "string") {
		console.warn("无效的WKT字符串");
		return null;
	}

	// 移除多余空格，但保留原始大小写以便处理Z后缀
	const cleanedString = wktString.replace(/\s+/g, " ").trim();
	const upperString = cleanedString.toUpperCase();

	try {
		// 匹配POINT、POINT Z等格式
		if (upperString.startsWith("POINT")) {
			const match = cleanedString.match(/POINT\s*Z?\s*\(([^)]+)\)/i);
			if (match) {
				const parts = match[1]
					.split(" ")
					.map(parseFloat)
					.filter((v) => !isNaN(v));
				const coord = {
					lng: parts[0],
					lat: parts[1],
				};
				if (parts.length >= 3) {
					coord.height = parts[2];
				}
				return {
					type: "Point",
					coordinates: [coord],
					hasHeight: parts.length >= 3,
				};
			}
		}
		// 匹配LINESTRING、LINESTRING Z等格式
		else if (upperString.startsWith("LINESTRING")) {
			const match = cleanedString.match(/LINESTRING\s*Z?\s*\(([^)]+)\)/i);
			if (match) {
				const coordinates = match[1].split(",").map((pair) => {
					const parts = pair
						.trim()
						.split(" ")
						.map(parseFloat)
						.filter((v) => !isNaN(v));
					const coord = {
						lng: parts[0],
						lat: parts[1],
					};
					if (parts.length >= 3) {
						coord.height = parts[2];
					}
					return coord;
				});
				return {
					type: "Polyline",
					coordinates,
					hasHeight:
						coordinates.length > 0 &&
						coordinates[0].height !== undefined,
				};
			}
		}
		// 匹配POLYGON、POLYGON Z等格式
		else if (upperString.startsWith("POLYGON")) {
			const match = cleanedString.match(
				/POLYGON\s*Z?\s*\(\(([^)]+)\)\)/i
			);
			if (match) {
				const coordinates = match[1].split(",").map((pair) => {
					const parts = pair
						.trim()
						.split(" ")
						.map(parseFloat)
						.filter((v) => !isNaN(v));
					const coord = {
						lng: parts[0],
						lat: parts[1],
					};
					if (parts.length >= 3) {
						coord.height = parts[2];
					}
					return coord;
				});
				// 移除最后一个坐标（如果它与第一个相同）
				if (
					coordinates.length > 1 &&
					Math.abs(
						coordinates[0].lng -
							coordinates[coordinates.length - 1].lng
					) < 1e-10 &&
					Math.abs(
						coordinates[0].lat -
							coordinates[coordinates.length - 1].lat
					) < 1e-10
				) {
					coordinates.pop();
				}
				return {
					type: "Polygon",
					coordinates,
					hasHeight:
						coordinates.length > 0 &&
						coordinates[0].height !== undefined,
				};
			}
		}
	} catch (error) {
		console.error("解析WKT失败:", error);
	}

	return null;
}

export default {
	coordinatesToWKT,
	lngLatArrayToWKT,
	wktToCoordinates,
};
