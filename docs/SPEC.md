# Spécifications fonctionnelles

## 1. Contexte

Une naturopathe reçoit ses patients en cabinet **uniquement le mercredi**. Aujourd'hui les rendez-vous se prennent par téléphone. L'objectif est de proposer une petite application web où les patients réservent eux-mêmes un créneau, et où la naturopathe garde la main sur son planning.

## 2. Acteurs

| Rôle | Description |
|---|---|
| Visiteur | Personne non connectée. Peut consulter la page d'accueil et les créneaux libres. |
| Patient (`PATIENT`) | Utilisateur inscrit. Peut réserver, consulter et annuler ses rendez-vous. |
| Naturopathe (`ADMIN`) | Compte unique créé au déploiement. Gère le planning et les patients. |

## 3. Règles métier

### Horaires

- Jour de consultation : **mercredi uniquement**.
- Plages : 9h00–12h00 et 14h00–18h00 (heure de Paris).
- Durée d'une consultation : **1 heure**, soit 7 créneaux par mercredi (9h, 10h, 11h, 14h, 15h, 16h, 17h).
- Ces valeurs sont des paramètres de configuration, pas des valeurs en dur dans le code.

### Réservation

- R1 : un créneau ne peut être réservé que par un seul patient.
- R2 : on ne peut pas réserver un créneau passé, ni un créneau qui commence dans moins de **24 heures**.
- R3 : on peut réserver au maximum **8 semaines** à l'avance.
- R4 : un patient a au maximum **un rendez-vous par mercredi**.
- R5 : un mercredi fermé par la naturopathe (congés, formation…) ne propose aucun créneau.

### Annulation

- R6 : un patient peut annuler son rendez-vous jusqu'à **24 heures** avant son début. Passé ce délai, il doit contacter le cabinet.
- R7 : la naturopathe peut annuler n'importe quel rendez-vous, à tout moment.
- R8 : un rendez-vous annulé libère le créneau. Il est conservé en base avec le statut `CANCELLED` (historique).

### Comptes

- R9 : l'email est unique et sert d'identifiant.
- R10 : mot de passe de 8 caractères minimum, avec au moins une lettre et un chiffre.
- R11 : un patient peut supprimer son compte. Ses données personnelles et ses rendez-vous sont alors supprimés (RGPD).

## 4. User stories

### Visiteur

- US1 : en tant que visiteur, je vois la présentation du cabinet et les prochains mercredis avec leurs créneaux libres.
- US2 : en tant que visiteur, je crée un compte (prénom, nom, email, téléphone, mot de passe).

### Patient

- US3 : je me connecte et je me déconnecte.
- US4 : je modifie mon profil (prénom, nom, téléphone).
- US5 : je supprime mon compte.
- US6 : je réserve un créneau libre et j'indique un motif de consultation (facultatif, 500 caractères max).
- US7 : je consulte mes rendez-vous à venir et passés.
- US8 : j'annule un rendez-vous à venir (dans le respect de R6).

### Naturopathe

- US9 : je vois le planning d'un mercredi donné, avec le nom et le téléphone de chaque patient.
- US10 : je ferme un mercredi (avec un motif) ou je le rouvre.
- US11 : j'annule un rendez-vous.
- US12 : je consulte la liste des patients inscrits.

## 5. Exigences non fonctionnelles

- **Sécurité** : mots de passe hachés (bcrypt), session par JWT en cookie `httpOnly`, contrôle des rôles côté API, validation de toutes les entrées.
- **RGPD** : données minimales, suppression de compte possible, pas de données de santé détaillées (le motif reste libre et facultatif).
- **Accessibilité** : navigation au clavier, contrastes suffisants, formulaires labellisés.
- **Responsive** : utilisable sur mobile.
- **Qualité** : chaque lot est livré avec ses tests. Le pipeline CI doit être vert pour merger dans `dev`.

## 6. Hors périmètre (V1)

- Paiement en ligne
- Plusieurs praticiens
- Différents types de consultation ou de durées
- Visioconférence
- Notifications par email (prévues en lot bonus, voir [ROADMAP.md](ROADMAP.md))
