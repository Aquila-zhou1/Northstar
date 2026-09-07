import { createRouter, createWebHistory } from 'vue-router';
import PlannerView from '../views/PlannerView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app' },
    {
      path: '/app',
      name: 'planner',
      component: PlannerView,
      meta: { requiresAuth: false }
    }
  ]
});
