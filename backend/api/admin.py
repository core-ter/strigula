from django.contrib import admin
from .models import Friendship, Transaction, FriendRequest, DebtCategory

class BaseAdmin(admin.ModelAdmin):
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')

@admin.register(FriendRequest)
class FriendRequestAdmin(BaseAdmin):
    list_display = ('id', 'from_user', 'to_user', 'created_at', 'deleted_at')
    search_fields = ('from_user__username', 'to_user__username')
    list_filter = ('created_at', 'deleted_at')

@admin.register(Friendship)
class FriendshipAdmin(BaseAdmin):
    list_display = ('id', 'user1', 'user2', 'created_at', 'deleted_at')
    search_fields = ('user1__username', 'user2__username')
    list_filter = ('created_at', 'deleted_at')

@admin.register(DebtCategory)
class DebtCategoryAdmin(BaseAdmin):
    list_display = ('id', 'name', 'friendship', 'created_by', 'created_at', 'deleted_at')
    search_fields = ('name', 'friendship__user1__username', 'friendship__user2__username')
    list_filter = ('created_at', 'deleted_at')

@admin.register(Transaction)
class TransactionAdmin(BaseAdmin):
    list_display = ('id', 'payer', 'debtor', 'amount', 'currency', 'type', 'category', 'created_at', 'deleted_at')
    list_filter = ('currency', 'type', 'created_at', 'deleted_at')
    search_fields = ('payer__username', 'debtor__username', 'description')
