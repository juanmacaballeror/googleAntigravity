import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Loading, Dialog } from 'quasar'
import { createRouter, createWebHistory } from 'vue-router'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/fontawesome-v6/fontawesome-v6.css'
import 'quasar/src/css/index.sass'
import './assets/main.css'
import App from './App.vue'
import { routes } from './router'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const router = createRouter({
  history: createWebHistory(),
  routes
})
app.use(router)

app.use(Quasar, {
  plugins: { Notify, Loading, Dialog },
  config: {
    dark: true,
    brand: {
      primary:   '#1a3a5c',
      secondary: '#2d7dd2',
      accent:    '#f0a500',
      dark:      '#0f1e2e',
      positive:  '#21ba45',
      negative:  '#e53935',
      info:      '#31ccec',
      warning:   '#f2c037'
    },
    notify: {
      position: 'top-right',
      timeout: 3000,
      textColor: 'white'
    }
  }
})

app.mount('#app')
