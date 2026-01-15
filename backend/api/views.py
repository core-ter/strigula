from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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

    @action(detail=False, methods=['get'])
    def friends(self, request):
        user = request.user
        # Find all friendships where the current user is involved
        friendships = Friendship.objects.filter(deleted_at__isnull=True).filter(
            Q(user1=user) | Q(user2=user)
        )
        # Extract friend IDs
        friend_ids = set()
        for f in friendships:
            if f.user1 == user:
                friend_ids.add(f.user2.id)
            else:
                friend_ids.add(f.user1.id)
        
        # Return User objects
        friends = User.objects.filter(id__in=friend_ids)
        serializer = self.get_serializer(friends, many=True)
        return Response(serializer.data)

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

    def perform_create(self, serializer):
        serializer.save(payer=self.request.user)

    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(deleted_at__isnull=True).filter(
            Q(payer=user) | Q(debtor=user)
        )

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save()
