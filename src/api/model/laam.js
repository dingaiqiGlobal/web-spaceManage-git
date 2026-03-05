/*
 * @Author: dys
 * @Date: 2025-09-09 09:36:13
 * @LastEditors: dys
 * @LastEditTime: 2026-02-06 11:08:00
 * @Descripttion: RESTful Style
 */
import http from '@/utils/request'
const BASE_URL = `/front/airspace`
/**
 * LayerTreeAPI
 */
const LayerTreeAPI = {
  getList(params = {}) {
    return http.get(`${BASE_URL}`, params)
  },
}
/**
 * 管理区API
 */
const zoneAPI = {
  getZones(params = {}) {
    return http.get(`${BASE_URL}/zones`, params)
  },
  createEditZone(data) {
    return http.post(`${BASE_URL}/zone`, data)
  },
  deleteZone(zoneId) {
    return http.delete(`${BASE_URL}/zone/${zoneId}`)
  },
  updateZoneStatus(zoneId, status) {
    return http.post(`${BASE_URL}/zone/${zoneId}/status?status=${status}`)
    // return http.post(`${BASE_URL}/zone/${zoneId}/status`, null, {
    // 	params: { status },
    // });
  },
}
/**
 * 网格API
 */
const gridAPI = {
  getGrid(data) {
    return http.post(`${BASE_URL}/grid/geojson`, data)
  },
}

/**
 * 用空计划管理API
 */
const planAPI = {
  getPlans(params = {}) {
    return http.get(`${BASE_URL}/plans`, params)
  },
  getDetails(planId) {
    return http.get(`${BASE_URL}/plan/${planId}`)
  },
  createEditPlan(data) {
    return http.post(`${BASE_URL}/plan`, data)
  },
  deletePlan(planId) {
    return http.delete(`${BASE_URL}/plan/${planId}`)
  },
  changeRoute(waypointsWKT) {
    return http.post(`${BASE_URL}/plan/route`, null, {
      params: { waypointsWKT },
    })
  },
}

export { LayerTreeAPI, zoneAPI, gridAPI, planAPI }
