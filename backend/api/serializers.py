from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FriendRequest, Friendship, DebtCategory, Transaction

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)
    to_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='to_user', write_only=True
    )

    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'to_user_id', 'created_at', 'deleted_at']
        read_only_fields = ['created_at', 'deleted_at']

class FriendshipSerializer(serializers.ModelSerializer):
    user1 = UserSerializer(read_only=True)
    user2 = UserSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ['id', 'user1', 'user2', 'created_at', 'deleted_at']
        read_only_fields = ['created_at', 'deleted_at']

class DebtCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtCategory
        fields = ['id', 'name', 'friendship', 'created_by', 'description', 'created_at', 'deleted_at']
        read_only_fields = ['created_at', 'deleted_at']

class TransactionSerializer(serializers.ModelSerializer):
    payer_name = serializers.ReadOnlyField(source='payer.username')
    debtor_name = serializers.ReadOnlyField(source='debtor.username')
    payer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'category', 'type', 'payer', 'debtor', 'payer_name', 'debtor_name',
            'amount', 'currency', 'description', 'created_at', 'deleted_at'
        ]
        read_only_fields = ['created_at', 'deleted_at']
