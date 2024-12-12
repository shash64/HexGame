# Jeu de Hex avec JavaScript

Ce projet est un jeu multijoueur utilisant Node.js, Express, D3.js et Socket.io. 
Il permet aux joueurs de se connecter, se déconnecter, d'envoyer des messages et de jouer à un jeu sur un plateau d'hexagones.

# Fonctionnalités
- Connexion, deconnexion et gestion des joueurs (noms/id/couleurs).
- Génération dynamique d'un plateau hexagonal avec D3.js.
- Envoi de messages en temps réel (chat box).
- Interaction avec les hexagones sur le plateau (clics).

# Structure du Projet
serveur_socket.io.js: Fichier du serveur, il gère les connexions et deconnexions des joueurs (fermeture de la page compris), les interactions (via la chat box et le jeu en lui même) et la synchronisation en temps réel.

client_socket.io.html: Fichier client, il comprend le script pour générer le plateau, gérer les événements avec le serveur et afficher les messages et autres textes dynamiques.

styles.css: Fichier css, il permet de rajouter de l'ésthetique au fichier HTML afin de rendre plus lisible et intuitif le projet et l'experience de l'utilisateur.


### Credit: 
 *shash*
