from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from .models import FriendRequest, Friendship, DebtCategory, Transaction

TEST_SETTINGS = {
    'SECRET_KEY': 'test-secret-key',
    'DATABASES': {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    },
}


@override_settings(**TEST_SETTINGS)
class UserRegistrationTests(APITestCase):
    """Tests for user registration via Djoser's /auth/users/ endpoint."""

    def test_register_user_success(self):
        response = self.client.post('/auth/users/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['username'], 'newuser')
        self.assertEqual(response.data['email'], 'newuser@example.com')
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_register_duplicate_username_fails(self):
        first = self.client.post('/auth/users/', {
            'username': 'dupe',
            'email': 'a@a.com',
            'password': 'strongp@ss987',
        })
        self.assertEqual(first.status_code, 201)
        self.assertTrue(User.objects.filter(username='dupe').exists())

        second = self.client.post('/auth/users/', {
            'username': 'dupe',
            'email': 'b@b.com',
            'password': 'differentP@ss123',
        })
        self.assertEqual(second.status_code, 400)

    def test_register_missing_password_fails(self):
        response = self.client.post('/auth/users/', {
            'username': 'nopass',
            'email': 'nopass@example.com',
        })
        self.assertEqual(response.status_code, 400)

    def test_register_short_password_fails(self):
        response = self.client.post('/auth/users/', {
            'username': 'shortpass',
            'email': 'short@example.com',
            'password': 'ab',
        })
        self.assertEqual(response.status_code, 400)

    def test_register_missing_username_fails(self):
        response = self.client.post('/auth/users/', {
            'email': 'nouser@example.com',
            'password': 'pass1234',
        })
        self.assertEqual(response.status_code, 400)


@override_settings(**TEST_SETTINGS)
class FriendRequestTests(APITestCase):
    """Tests for sending friend requests via /api/friend-requests/."""

    def setUp(self):
        self.alice = User.objects.create_user('alice', password='alicepass')
        self.bob = User.objects.create_user('bob', password='bobpass')
        self.charlie = User.objects.create_user('charlie', password='charliepass')
        self.client.force_authenticate(user=self.alice)

    def test_send_friend_request_success(self):
        response = self.client.post('/api/friend-requests/', {
            'to_user': self.bob.id
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['from_user'], self.alice.id)
        self.assertEqual(int(response.data['to_user']), self.bob.id)
        self.assertTrue(
            FriendRequest.objects.filter(
                from_user=self.alice, to_user=self.bob, deleted_at__isnull=True
            ).exists()
        )

    def test_self_friend_request_fails(self):
        response = self.client.post('/api/friend-requests/', {
            'to_user': self.alice.id
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('detail', response.data)

    def test_duplicate_friend_request_fails(self):
        self.client.post('/api/friend-requests/', {'to_user': self.bob.id})
        response = self.client.post('/api/friend-requests/', {'to_user': self.bob.id})
        self.assertEqual(response.status_code, 400)

    def test_reverse_pending_request_blocks_mine(self):
        self.client.post('/api/friend-requests/', {'to_user': self.bob.id})
        self.client.force_authenticate(user=self.bob)
        response = self.client.post('/api/friend-requests/', {'to_user': self.alice.id})
        self.assertEqual(response.status_code, 400)

    def test_friend_request_to_existing_friend_fails(self):
        user1, user2 = sorted([self.alice, self.bob], key=lambda u: u.id)
        Friendship.objects.create(user1=user1, user2=user2)
        response = self.client.post('/api/friend-requests/', {'to_user': self.bob.id})
        self.assertEqual(response.status_code, 400)

    def test_missing_to_user_fails(self):
        response = self.client.post('/api/friend-requests/', {})
        self.assertEqual(response.status_code, 400)

    def test_zombie_request_resurrection(self):
        req = FriendRequest.objects.create(
            from_user=self.alice, to_user=self.bob
        )
        req.deleted_at = '2025-01-01T00:00:00Z'
        req.save()

        response = self.client.post('/api/friend-requests/', {'to_user': self.bob.id})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['id'], req.id)
        req.refresh_from_db()
        self.assertIsNone(req.deleted_at)


@override_settings(**TEST_SETTINGS)
class TransactionTests(APITestCase):
    """Tests for creating transactions via /api/transactions/."""

    def setUp(self):
        self.alice = User.objects.create_user('alice', password='alicepass')
        self.bob = User.objects.create_user('bob', password='bobpass')
        user1, user2 = sorted([self.alice, self.bob], key=lambda u: u.id)
        self.friendship = Friendship.objects.create(user1=user1, user2=user2)
        self.category = DebtCategory.objects.create(
            friendship=self.friendship,
            created_by=self.alice,
            name='Kaja',
            description='Közös kajálások'
        )
        self.client.force_authenticate(user=self.alice)

    def test_create_transaction_success(self):
        response = self.client.post('/api/transactions/', {
            'amount': 5000,
            'debtor': self.bob.id,
            'category': self.category.id,
            'type': 'expense',
            'currency': 'HUF',
            'description': 'Pizza',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['payer'], self.alice.id)
        self.assertEqual(response.data['debtor'], self.bob.id)
        self.assertEqual(response.data['amount'], '5000.00')
        self.assertEqual(response.data['currency'], 'HUF')
        self.assertEqual(response.data['payer_name'], 'alice')
        self.assertEqual(response.data['debtor_name'], 'bob')

        tx = Transaction.objects.get(id=response.data['id'])
        self.assertEqual(tx.payer, self.alice)
        self.assertEqual(tx.debtor, self.bob)
        self.assertEqual(tx.amount, 5000)

    def test_payer_is_auto_set_to_authenticated_user(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.post('/api/transactions/', {
            'amount': 3000,
            'debtor': self.alice.id,
            'category': self.category.id,
            'type': 'expense',
            'currency': 'HUF',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['payer'], self.bob.id)

    def test_create_transaction_missing_amount_fails(self):
        response = self.client.post('/api/transactions/', {
            'debtor': self.bob.id,
            'category': self.category.id,
            'type': 'expense',
        })
        self.assertEqual(response.status_code, 400)

    def test_create_transaction_missing_debtor_fails(self):
        response = self.client.post('/api/transactions/', {
            'amount': 5000,
            'category': self.category.id,
            'type': 'expense',
        })
        self.assertEqual(response.status_code, 400)

    def test_create_transaction_negative_amount_fails(self):
        response = self.client.post('/api/transactions/', {
            'amount': -100,
            'debtor': self.bob.id,
            'category': self.category.id,
            'type': 'expense',
            'currency': 'HUF',
        })
        self.assertEqual(response.status_code, 400)

    def test_create_transaction_zero_amount_fails(self):
        response = self.client.post('/api/transactions/', {
            'amount': 0,
            'debtor': self.bob.id,
            'category': self.category.id,
            'type': 'expense',
            'currency': 'HUF',
        })
        self.assertEqual(response.status_code, 400)

    def test_create_transaction_with_defaults(self):
        response = self.client.post('/api/transactions/', {
            'amount': 2500,
            'debtor': self.bob.id,
            'category': self.category.id,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['type'], 'expense')
        self.assertEqual(response.data['currency'], 'HUF')

    def test_create_transaction_unauthenticated_fails(self):
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/transactions/', {
            'amount': 5000,
            'debtor': self.bob.id,
            'category': self.category.id,
        })
        self.assertEqual(response.status_code, 401)

    def test_create_repayment_transaction(self):
        response = self.client.post('/api/transactions/', {
            'amount': 2000,
            'debtor': self.bob.id,
            'category': self.category.id,
            'type': 'repayment',
            'currency': 'HUF',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['type'], 'repayment')
