import axios from 'axios'
import { ElNotification, ElMessageBox, ElMessage } from 'element-plus'
// import tool from '@/utils/tool'
// import router from '@/router'

axios.defaults.baseURL = '/laam'
axios.defaults.timeout = 50000

// HTTP request 拦截器(后补)

// HTTP response 拦截器
axios.interceptors.response.use(
  function (response) {
    return response
  },
  function (error) {
    if (error && error.response) {
      switch (error.response.status) {
        case 400:
          ElMessage.warning(error.response.data.error.details)
          break
        case 401:
          ElMessage.warning('未授权')
          break
        case 403:
          ElMessage.warning('已重复发布')
          break
        case 404:
          ElMessage.warning('未连接')
          break
        case 405:
          ElMessage.warning('请求方法错误')
          break
        case 408:
          ElMessage.warning('请求超时')
          break
        case 409:
          ElMessage.warning('冲突')
          break
        case 500:
          ElMessage.warning('内部错误')
          break
        case 501:
          ElMessage.warning('尚未实施')
          break
        case 502:
          ElMessage.warning('网关错误')
          break
        case 503:
          ElMessage.warning('服务不可用')
          break
        case 504:
          ElMessage.warning('超时')
          break
        case 505:
          ElMessage.warning('不受支持')
          break
        default:
      }
    }
    return Promise.reject(error)
  },
)

let http = {
  /** get 请求
   * @param  {接口地址} url
   * @param  {请求参数} params
   * @param  {参数} config
   */
  get: function (url, params = {}, config = {}) {
    return new Promise((resolve, reject) => {
      axios({
        method: 'get',
        url: url,
        params: params,
        ...config,
      })
        .then((response) => {
          resolve(response.data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },

  /** post 请求
   * @param  {接口地址} url
   * @param  {请求参数} data
   * @param  {参数} config
   */
  post: function (url, data = {}, config = {}) {
    return new Promise((resolve, reject) => {
      axios({
        method: 'post',
        url: url,
        data: data,
        ...config,
      })
        .then((response) => {
          resolve(response.data)
        })
        .catch((error) => {
          // 显示错误弹窗
          console.error('请求出错:', error)
          let errorMsg = '请求失败'

          // 尝试获取详细错误信息
          if (error.response) {
            errorMsg = `请求错误 (${error.response.status}): ${error.response.data?.message || '未知错误'}`
          } else if (error.request) {
            errorMsg = '服务器未响应请求'
          } else {
            errorMsg = `请求配置错误: ${error.message}`
          }

          // 显示弹窗
          alert(`API错误 (${url}): ${errorMsg}`)
          reject(error)
        })
    })
  },

  /** put 请求
   * @param  {接口地址} url
   * @param  {请求参数} data
   * @param  {参数} config
   */
  put: function (url, data = {}, config = {}) {
    return new Promise((resolve, reject) => {
      axios({
        method: 'put',
        url: url,
        data: data,
        ...config,
      })
        .then((response) => {
          resolve(response.data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },

  /** patch 请求
   * @param  {接口地址} url
   * @param  {请求参数} data
   * @param  {参数} config
   */
  patch: function (url, data = {}, config = {}) {
    return new Promise((resolve, reject) => {
      axios({
        method: 'patch',
        url: url,
        data: data,
        ...config,
      })
        .then((response) => {
          resolve(response.data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },

  /** delete 请求
   * @param  {接口地址} url
   * @param  {请求参数} data
   * @param  {参数} config
   */
  delete: function (url, data = {}, config = {}) {
    return new Promise((resolve, reject) => {
      axios({
        method: 'delete',
        url: url,
        data: data,
        ...config,
      })
        .then((response) => {
          resolve(response.data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },

  /** jsonp 请求
   * @param  {接口地址} url
   * @param  {JSONP回调函数名称} name
   */
  jsonp: function (url, name = 'jsonp') {
    return new Promise((resolve) => {
      var script = document.createElement('script')
      var _id = `jsonp${Math.ceil(Math.random() * 1000000)}`
      script.id = _id
      script.type = 'text/javascript'
      script.src = url
      window[name] = (response) => {
        resolve(response)
        document.getElementsByTagName('head')[0].removeChild(script)
        try {
          delete window[name]
        } catch (e) {
          window[name] = undefined
        }
      }
      document.getElementsByTagName('head')[0].appendChild(script)
    })
  },
}

export default http
