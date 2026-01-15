from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, FriendRequestViewSet, FriendshipViewSet,
    DebtCategoryViewSet, TransactionViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'friend-requests', FriendRequestViewSet, basename='friend-request')
router.register(r'friendships', FriendshipViewSet, basename='friendship')
router.register(r'debt-categories', DebtCategoryViewSet, basename='debt-category')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]
