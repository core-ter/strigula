from django.db import models
from django.contrib.auth.models import User
from django.db.models import CheckConstraint, Q

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

class FriendRequest(BaseModel):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')

    class Meta:
        unique_together = ('from_user', 'to_user')
        constraints = [
            CheckConstraint(condition=~Q(from_user=models.F('to_user')), name='check_not_self_request')
        ]

    def __str__(self):
        return f"Request: {self.from_user.username} -> {self.to_user.username}"

class Friendship(BaseModel):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships2')

    class Meta:
        unique_together = ('user1', 'user2')
        constraints = [
            CheckConstraint(condition=~Q(user1=models.F('user2')), name='check_user1_ne_user2')
        ]

    def __str__(self):
        return f"{self.user1.username} & {self.user2.username}"

class DebtCategory(BaseModel):
    friendship = models.ForeignKey(Friendship, on_delete=models.CASCADE, related_name='categories')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_categories')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Transaction(BaseModel):
    TRANSACTION_TYPES = [
        ('expense', 'Expense'),
        ('repayment', 'Repayment'),
    ]

from django.core.validators import MinValueValidator

class Transaction(BaseModel):
    TRANSACTION_TYPES = [
        ('expense', 'Expense'),
        ('repayment', 'Repayment'),
    ]

    category = models.ForeignKey(DebtCategory, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='expense')
    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='paid_transactions')
    debtor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owed_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(1)])
    currency = models.CharField(max_length=3, default='HUF')
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.payer.username} -> {self.debtor.username}: {self.amount} {self.currency}"
