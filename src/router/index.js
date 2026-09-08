import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import EmailAuthView from '../views/EmailAuthView.vue';
import PlannerView from '../views/PlannerView.vue';
import VerifyEmailView from '../views/VerifyEmailView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app' },
    {
      path: '/signup',
      name: 'signup',
      component: EmailAuthView,
      props: { intent: 'signup' },
      meta: { guestOnly: true }
    },
    {
      path: '/login',
      name: 'login',
      component: EmailAuthView,
      props: { intent: 'login' },
      meta: { guestOnly: true }
    },
    {
      path: '/verify',
      name: 'verify',
      component: VerifyEmailView,
      meta: { guestOnly: true }
    },
    {
      path: '/app',
      name: 'planner',
      component: PlannerView,
      meta: { requiresAuth: true }
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach(async to => {
  const auth = useAuth();
  try {
    await auth.ensureInitialized();
  } catch {
    if (to.name !== 'login') return { name: 'login' };
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated.value) {
    return { name: 'planner' };
  }

  if (to.name === 'verify') {
    const validIntent = to.query.intent === 'signup' || to.query.intent === 'login';
    const validEmail = typeof to.query.email === 'string' && to.query.email.includes('@');
    if (!validIntent || !validEmail) {
      return { name: 'login' };
    }
  }
});

export default router;
