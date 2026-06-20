import { createRouter, createWebHistory } from 'vue-router'
import About from '../views/About.vue'
import Converter from '../views/Converter.vue'
import HealthCheck from '../views/HealthCheck.vue'
import Home from '../views/Home.vue'
import Merge from '../views/Merge.vue'
import ShortLink from '../views/ShortLink.vue'

const routes = [
    {
        path: '/',
        redirect: '/converter'
    },
    {
        path: '/converter',
        name: 'Converter',
        component: Converter
    },
    {
        path: '/shortlink',
        name: 'ShortLink',
        component: ShortLink
    },
    {
        path: '/about',
        name: 'About',
        component: About
    },
    {
        path: '/health',
        name: 'HealthCheck',
        component: HealthCheck
    },
    {
        path: '/merge',
        name: 'Merge',
        component: Merge
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

export default router
