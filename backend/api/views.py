import csv
import io
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
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

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('query', '')
        if not query:
            return Response([])

        user = request.user
        
        # Exclude self
        queryset = User.objects.filter(username__icontains=query).exclude(id=user.id)

        # Exclude existing friends (in either direction)
        friendships = Friendship.objects.filter(deleted_at__isnull=True).filter(
            Q(user1=user) | Q(user2=user)
        )
        friend_ids = set()
        for f in friendships:
            friend_ids.add(f.user1.id if f.user2 == user else f.user2.id)
        
        queryset = queryset.exclude(id__in=friend_ids)

        # Exclude pending requests (optional, but good UX)
        # We can implement this if desired, or just let them see pending requests status.
        # For now, let's keep it simple and maybe just show them.
        # Ideally we exclude pending too? Let's check user request: "Csak új embereket akarok látni"
        # "akikkel már van bármilyen (pending/accepted) friendship kapcsolatom" -> So yes, exclude pending too.
        
        sent_requests = FriendRequest.objects.filter(deleted_at__isnull=True, from_user=user)
        received_requests = FriendRequest.objects.filter(deleted_at__isnull=True, to_user=user)
        
        pending_ids = set()
        for r in sent_requests:
            pending_ids.add(r.to_user.id)
        for r in received_requests:
            pending_ids.add(r.from_user.id)
            
        queryset = queryset.exclude(id__in=pending_ids)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return FriendRequest.objects.filter(deleted_at__isnull=True).filter(
            Q(from_user=user) | Q(to_user=user)
        )

    def create(self, request, *args, **kwargs):
        from_user = request.user
        to_user_id = request.data.get('to_user')
        
        # Alapvető validációk
        if not to_user_id:
             return Response({"detail": "Hiányzó to_user ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Magadat nem jelölheted
            if from_user.id == int(to_user_id):
                return Response({"detail": "Saját magadat nem jelölheted be."}, status=status.HTTP_400_BAD_REQUEST)
                
            # 2. Már van AKTÍV kérés?
            existing_request = FriendRequest.objects.filter(deleted_at__isnull=True).filter(
                (Q(from_user=from_user) & Q(to_user_id=to_user_id)) |
                (Q(from_user_id=to_user_id) & Q(to_user=from_user))
            ).exists()
            
            if existing_request:
                return Response({"detail": "Már van folyamatban lévő kérés."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. Már barátok?
            friends = Friendship.objects.filter(deleted_at__isnull=True).filter(
                (Q(user1=from_user) & Q(user2_id=to_user_id)) |
                (Q(user1_id=to_user_id) & Q(user2=from_user))
            ).exists()

            if friends:
                return Response({"detail": "Már barátok vagytok."}, status=status.HTTP_400_BAD_REQUEST)

            # --- A JAVÍTÁS (A ZOMBIK KEZELÉSE) ---
            
            # Megnézzük, van-e TÖRÖLT kérés, amit újraéleszthetünk?
            # Itt kifejezetten a "from -> to" irányt nézzük, mert ha én újra jelölöm, az az én kérésem.
            dead_request = FriendRequest.objects.filter(
                from_user=from_user, 
                to_user_id=to_user_id, 
                deleted_at__isnull=False
            ).first()

            if dead_request:
                # Ha volt ilyen, feltámasztjuk!
                dead_request.deleted_at = None
                dead_request.save()
                serializer = self.get_serializer(dead_request)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            # Ha nincs hulla, akkor létrehozunk egy újat
            friend_request = FriendRequest.objects.create(from_user=from_user, to_user_id=to_user_id)
            serializer = self.get_serializer(friend_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Végső biztonsági háló, hogy SOHA ne legyen 500-as hiba, hanem lássuk, mi a baj
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    def create(self, request, *args, **kwargs):
        try:
            other_user_id = request.data.get('user2')
            if not other_user_id:
                return Response({"detail": "Hiányzó user2 ID."}, status=status.HTTP_400_BAD_REQUEST)
            
            other_user = User.objects.get(id=other_user_id)
            
            # ID alapú rendezés (kisebb ID -> user1)
            user1, user2 = sorted([request.user, other_user], key=lambda u: u.id)
            
            # Keresés (töröltekkel együtt)
            existing = Friendship.objects.filter(user1=user1, user2=user2).first()
            
            if existing:
                if existing.deleted_at:
                    # Feltámasztás
                    existing.deleted_at = None
                    existing.save()
                    serializer = self.get_serializer(existing)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response({"detail": "Már barátok vagytok."}, status=status.HTTP_200_OK)
            
            # Létrehozás
            friendship = Friendship.objects.create(user1=user1, user2=user2)
            serializer = self.get_serializer(friendship)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
             return Response({"detail": "A felhasználó nem található."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        user = request.user
        transactions = self.get_queryset().select_related('category', 'payer', 'debtor').order_by('-created_at')

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(['ID', 'Típus', 'Fizető', 'Adós', 'Kategória', 'Összeg', 'Pénznem', 'Leírás', 'Létrehozva'])

        for t in transactions:
            writer.writerow([
                t.id,
                'Kiadás' if t.type == 'expense' else 'Visszafizetés',
                t.payer.username if t.payer else '',
                t.debtor.username if t.debtor else '',
                t.category.name if t.category else '',
                str(t.amount),
                t.currency,
                t.description,
                t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])

        csv_body = '\uFEFF' + output.getvalue()
        response = HttpResponse(csv_body, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="tranzakciok.csv"'
        return response
