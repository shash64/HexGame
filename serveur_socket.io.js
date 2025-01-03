/* On importe les modules nécessaires au fonctionnement du serveur js */
const express = require('express'); 
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new require("socket.io")(server);
const os = require('os');

const nbJoueursMax = 2; //Variable pour définir le nombre de joueurs maximum pour le jeu
let joueurs = []; //Création d'un tableau de joueurs
let id = []; //Création d'un tableau d'ids
let idHexagone = []; //Création d'un tableau d'id d'hexagone
let nbCoups = 0; //int qui s'incremente a chaque coups d'un joueur
let PartieCommencable = true //Booleen pour savoir si la partie est commencable
let etatHexagones = Array(11 * 11).fill(null); // Tableau pour suivre l'état des hexagones
let partieEnCours = false; //Booleen pour savoir si la partie est en cours

//Fonction utilisant os pour recuperer l'adresse de l'utilisateur locale de l'utilisateur 
function getAdresseLocale() {
    return Object.values(os.networkInterfaces())
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal).address;
}
const adresseLocale = getAdresseLocale() //Variable stockant l'adresse locale.

server.listen(8888, adresseLocale, () => { //Configuration du serveur
    console.log(`Le serveur écoute sur http://${adresseLocale}:8888`); //message dans la console pour afficher en ligne de commande le lien pour l'utilisateur
});

app.use('/styles', express.static(__dirname + '/styles')); //Référence à la feuille de style css

/* L'application créé un lien serveur <-> client en donnant comme réponse aux connexions le fichier HTML */
app.get('/', (request, response) => {
    response.sendFile('client_socket.io.html', {root: __dirname});
});

io.on('connection', (socket) => { //Lorsqu'une connexion au serveur est détéctée (ouverture de la page par un utilisateur)
    if (partieEnCours) {  // Envoyer l'état actuel si une partie est en cours
        socket.emit('etatPartie', {etatHexagones,joueurs,nbCoups}); // Renvoie l'état de la partie en cours
        io.emit('AllJoueurs', joueurs); // Renvoie la liste des joueurs en jeu
    }

    socket.on('entrerPartie', (nomJoueur, callback) => { //On attend la requête client "entrer Partie" via le boutton de la page et on récupère le nom du Joueur
        if (joueurs.length>=nbJoueursMax){ //Si le tableau des joueurs est plus grand en taille que le nombre de joueurs max
            callback({sucess: false, message : "La partie est complete"}); //On renvoie via la fonction de callback un succes: false et un message
        }else if(id.includes(socket.id)){ //Si l'id de la session est déjà présent dans le tableau des ids
            callback({sucess: false, message : "Vous êtes deja connecté"}); //On renvoie à nouveau un succes: false et un message
        }else{ //Sinon
            console.log("Un joueur est connecté", socket.id); //On renvoie sur la console l'id du joueur connecté
            const numeroJoueur = joueurs.length +1; //On attribue un numéro au nouveau joueur selon son placement dans le tableau des joueurs
            const joueur = {id: socket.id, nom: nomJoueur, numero: numeroJoueur}; //On construit un élément joueur avec son id, son nom et son numéro
            joueurs.push(joueur); //On ajoute l'élément dans le tableau des joueurs
            id.push(socket.id)
            
            if(joueurs.length===nbJoueursMax){ //Si le nombre de joueurs présent dans le tableau joueurs est égale au nombre de joueurs max
                partieEnCours = true; 
                io.emit('AllJoueurs',joueurs); //On renvoie côté client la liste des joueurs pour l'afficher en HTML
                callback({sucess: true, message : "La partie est prete a etre lancee"}); //On renvoie un succes: true avec un message de succès
            
            }else{ //Sinon
                io.emit('AllJoueurs',joueurs); //On renvoie côté client la liste des joueurs pour l'afficher en HTML
                callback({success:true}); //On renvoie un succes: true sans message
            }

        }
    });

    socket.on('onClickHex', (data) => { // Lorsqu'on reçoit une requête d'un hexagone cliqué
        if(idHexagone.includes(data)){ // On vérifie si l'hexagone est déjà cliqué
            console.log("essai d'un hexagone déja cliqué");
        }
        else{
            for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueur
                if(joueurs[i].id===socket.id&&(nbCoups%nbJoueursMax)==i){ // On vérifie que c'est bien le joueur connecté qui joue et que c'est bien à son tour
                    idHexagone.push({id: data, joueur: i});; // On ajoute les données (id de l'hexagone et joueur) au tableau de 11*11 idHexagone
                    etatHexagones[data] = i; // On marque l'hexagone pour le joueur
                    nbCoups++; // On incrémente la variable du nombre de coups

                    io.emit('affichageHex',{nomProchainJoueur: joueurs[(i+1)%nbJoueursMax].nom, idHex:data, col: (joueurs[i].numero)-1}); // On actualise le tablier pour tous les joueurs avec les données

                    if (verifierVictoire(i, etatHexagones, 11, 11)) { // On vérifie les conditions de victoire
                        io.emit('victoire', { gagnant: joueurs[i].nom ,historique: idHexagone}); // Si il y'a victopire on renvoie le nom du gagnant et on renvoie l'historique de la partie
                        console.log(`Victoire de ${joueurs[i].nom}`);  // On renvoie son nom dans le terminal du serveur
                        return;
                    }
                }
            }

        } 
    });

    socket.on('envoyerMessage', (message) =>{ // Lorsqu'on reçoit une requête envoyerMessage
        for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
            if(joueurs[i].id===socket.id){ // Si le joueur actuel est bien le joueur connecté
                io.emit('nouveauMessage',{nom: joueurs[i].nom, message, col: (joueurs[i].numero)-1});} // On renvoie nouveauMessage pour afficher le message avec le nom du joueur, son message et son numéro
        }
    });

    socket.on('deco',()=> { // Requête lorque le bouton Deconnexion est cliqué sur la page
        deconnexion(); //On appel la fonction deconnexion
    })

    socket.on('disconnect',() => { // Requête lorsqu'un joueur quitte la page
        deconnexion(); // On appel la fonction deconnexion
    })

    socket.on('commencerPartie',() => { // Lorsqu'on reçoit la requête commencerPartie
        for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
            if(joueurs[i].id===socket.id&&joueurs.length==nbJoueursMax&&PartieCommencable){ // On vérifie si les joueur sont bien connectés, si il y'a bien 2 joueurs et si la partie est commençable
                io.emit('commencerPartie') // On renvoie la possibilité que la partie commence
                idHexagone = []; // On initialise le tableau des ids hexagones 
                etatHexagones.fill(null); // On reinitialise le tableau des états d'hexagone
                nbCoups = 0; // On initialise le nombre de coups à 0
                PartieCommencable = false; // On remet la variable à false (car la partie vient de commencer)
            }
        }
    })

    socket.on('recommencerPartie',() => { // Si on reçoit recommencerPartie
        resetPartie(); // On appel la fonction resetPartie
    })

    function resetPartie(){
        for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
            if(joueurs[i].id===socket.id&&joueurs.length==nbJoueursMax){ // On vérifie si les joueur sont bien connectés et si il y'a bien 2 joueurs
                idHexagone = []; // On réinitialise le tableau d'id d'hexagone
                nbCoups = 0; // On réinitialise le nombre de coups à 0
                PartieCommencable = false // On remet la variable à false (car la partie vient de commencer)
                etatHexagones.fill(null); // On reinitialise le tableau des états d'hexagone
                io.emit('commencerPartie') // On renvoie la possibilité que la partie commence
            }
        }
    }


    function deconnexion(){ // Fonction qui gère la deconnexion des joueurs
        for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
            if(joueurs[i].id===socket.id){ // Si les joueurs sont bien connectés (sinon on ne peut pas les déconnecter)
                console.log("un joueur est decconecté", socket.id); // On renvoie l'id du joueur déconnecté 
                let newjoueurs = []; // On initialise un taableau de nouveaux joueurs
                let newid = []; // On initialise un nouveau tableau d'ids
                for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
                    if(joueurs[i].id!==socket.id){ // Si l'id du joueur dans le tableau joueur est différent de l'id de la session
                        newjoueurs.push(joueurs[i]); // On ajoute le joueur dans le nouveau tableau de joueurs
                        newid.push(joueurs[i].id); // On ajout l'id du joueur dans le nouveau tableau des ids
                    }
                }
                joueurs=newjoueurs; // On écrase le tableau joueurs part le tableau des nouveaux joueurs
                if(joueurs.length<nbJoueursMax){ // Si le tableau des joueurs est plus petit que le nombre de joueurs
                    PartieCommencable = true; // On mets à true la variable PartieCommencable
                    partieEnCours = false; // On mets à false la variable partieEnCours
                    resetPartie(); // On appel la fonction resetPartie
                }
                id = newid; // On écrase le tableau des ids part le nouveau tableau des ids
                for (let i =0; i<joueurs.length;i++){ // On boucle sur le nombre de joueurs
                    joueurs[i].numero=i+1; // On attribue un numéro unique aux joueurs
                }
                io.emit('AllJoueurs', joueurs); // On renvoie AllJoueurs côté client avec le tableau des joueurs 
            }
        }
    }

});

function getVoisins(idHex, nbLignes, nbColonnes) { //Fonction qui retourne les voisins d'un hexagone
    const ligne = Math.floor(idHex / nbColonnes); //Calcule l’indice de ligne de l’hexagone dans le plateau
    const colonne = idHex % nbColonnes; //Calcule l’indice de colonne de l’hexagone dans le plateau

    const voisins = []; //initialisation d'un tableau pour stocker les voisins
    const directions = [
        [-1, 0],  // Haut-gauche
        [-1, 1],  // Haut-droite
        [0, -1],  // Gauche
        [0, 1],   // Droite
        [1, -1],  // Bas-gauche
        [1, 0]    // Bas-droite
    ];

    directions.forEach(([dx, dy]) => { //parcours les directions
        //calcul du voisin en fonction de la direction
        const newLigne = ligne + dx;
        const newColonne = colonne + dy;

        if (newLigne >= 0 && newLigne < nbLignes && newColonne >= 0 && newColonne < nbColonnes) {//si le voisin est dans la limite du plateau
            voisins.push(newLigne * nbColonnes + newColonne); //on calcule son id et on l'ajoute dans le tableau
        }
    });

    return voisins;
}

function verifierVictoire(joueurId, tableau, nbLignes, nbColonnes) {
    const visited = new Set(); //nouvelle collection d'id visités

    function dfs(hexId) {
        //Verification de l'appartennence avant l'ajout
        if (visited.has(hexId)) return false;
        visited.add(hexId);

        // Si l'hexagone appartient au bord opposé, victoire !
        if ((joueurId === 0 && Math.floor(hexId / nbColonnes) === nbLignes - 1) ||
            (joueurId === 1 && hexId % nbColonnes === nbColonnes - 1)) {
            return true;
        }

        // Parcourt les voisins
        for (const voisin of getVoisins(hexId, nbLignes, nbColonnes)) {
            if (tableau[voisin] === joueurId && dfs(voisin)) { //Si le voisin appartient au joueur actuel, appel récursif
                return true; //chemin donc victoire
            }
        }

        return false;
    }

    // Recherche les hexagones du bord de départ en fonction du joueur 1 ou 2
    const bords = (joueurId === 0 ? [...Array(nbColonnes).keys()] : [...Array(nbLignes).keys()].map(l => l * nbColonnes));

    return bords.some(startHex => tableau[startHex] === joueurId && dfs(startHex)); //Parcourt les hexagones de départ avec la méthode some et pour chaque hexagone de départ, 
    // si une exploration mène à un chemin victorieux, la fonction retourne true
}
