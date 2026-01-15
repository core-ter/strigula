from rest_framework import viewsets, permissions
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth.models import User
from .models import FriendRequest, Friendship, DebtCategory, Transaction
from .serializers import (
    UserSerializer, FriendRequestSerializer, FriendshipSerializer,
    DebtCategorySerializer, TransactionSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return FriendRequest.objects.filter(deleted_at__isnull=True).filter(
            Q(from_user=user) | Q(to_user=user)
        )

    def perform_create(self, serializer):
        serializer.save(from_user=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()

class FriendshipViewSet(viewsets.ModelViewSet):
    serializer_class = FriendshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Friendship.objects.filter(deleted_at__isnull=True).filter(
            Q(user1=user) | Q(user2=user)
        )

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()

class DebtCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = DebtCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return DebtCategory.objects.filter(deleted_at__isnull=True).filter(
            Q(friendship__user1=user) | Q(friendship__user2=user)
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(deleted_at__isnull=True).filter(
            Q(payer=user) | Q(debtor=user)
        )

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()
