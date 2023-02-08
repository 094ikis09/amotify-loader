// import 'amotify/styles'
import './main.scss'
import { createApp } from 'vue'
import { createAmotify } from 'amotify'

import App from './App.vue'

createApp(App).use(createAmotify()).mount('#app')