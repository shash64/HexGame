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
let nbCoups = 0;
let PartieCommencable = true;
let etatHexagones = Array(11 * 11).fill(null); // Tableau pour suivre l'état des hexagones
let partieEnCours = false;

function getAdresseLocale() {
    return Object.values(os.networkInterfaces())
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal).address;
}
const adresseLocale = getAdresseLocale()

server.listen(8888, adresseLocale, () => {
    console.log(`Le serveur écoute sur http://${adresseLocale}:8888`);
});

app.use('/styles', express.static(__dirname + '/styles')); //Référence à la feuille de style css

/* L'application créé un lien serveur <-> client en donnant comme réponse aux connexions le fichier HTML */
app.get('/', (request, response) => {
    response.sendFile('client_socket.io.html', {root: __dirname});
});

io.on('connection', (socket) => { //Lorsqu'une connexion au serveur est détectée
        // Envoyer l'état actuel si une partie est en cours
        if (partieEnCours) {
            socket.emit('etatPartie', {etatHexagones,joueurs,nbCoups});
            io.emit('AllJoueurs', joueurs);
        }
    
    socket.on('entrerPartie', (nomJoueur, callback) => {
        if (joueurs.length >= nbJoueursMax) {
            callback({success: false, message: "La partie est complète"});
        } else if (id.includes(socket.id)) {
            callback({success: false, message: "Vous êtes déjà connecté"});
        } else {
            console.log("Un joueur est connecté", socket.id);
            const numeroJoueur = joueurs.length + 1;
            const joueur = {id: socket.id, nom: nomJoueur, numero: numeroJoueur};
            joueurs.push(joueur);
            id.push(socket.id);

            if (joueurs.length === nbJoueursMax) {
                partieEnCours = true;
                io.emit('AllJoueurs', joueurs);
                callback({success: true, message: "La partie est prête à être lancée"});
            } else {
                io.emit('AllJoueurs', joueurs);
                callback({success: true});
            }
        }
    });

    socket.on('onClickHex', (data) => {
        if (idHexagone.includes(data)) {
            console.log("Essai d'un hexagone déjà cliqué");
        } else {
            for (let i = 0; i < joueurs.length; i++) {
                if (joueurs[i].id === socket.id && (nbCoups % nbJoueursMax) === i) {
                    idHexagone.push(data);
                    etatHexagones[data] = i; // Marque l'hexagone pour le joueur
                    nbCoups++;

                    // Vérifie les conditions de victoire
                    if (verifierVictoire(i, etatHexagones, 11, 11)) {
                        io.emit('victoire', { gagnant: joueurs[i].nom });
                        console.log(`Victoire de ${joueurs[i].nom}`);
                        return;
                    }

                    io.emit('affichageHex', {
                        nomProchainJoueur: joueurs[(i + 1) % nbJoueursMax].nom,
                        idHex: data,
                        col: (joueurs[i].numero) - 1
                    });
                }
            }
        }
    });

    socket.on('envoyerMessage', (message) => {
        for (let i = 0; i < joueurs.length; i++) {
            if (joueurs[i].id === socket.id) {
                io.emit('nouveauMessage', {nom: joueurs[i].nom, message, col: (joueurs[i].numero) - 1});
            }
        }
    });

    socket.on('deco', () => {
        deconnexion();
    });

    socket.on('disconnect', () => {
        deconnexion();
    });

    socket.on('commencerPartie', () => {
        if (joueurs.length === nbJoueursMax && PartieCommencable) {
            io.emit('commencerPartie');
            idHexagone = [];
            etatHexagones.fill(null);
            nbCoups = 0;
            PartieCommencable = false;
        }
    });

    function deconnexion() {
        console.log("Un joueur est déconnecté", socket.id);
        let newJoueurs = [];
        let newId = [];
        for (let i = 0; i < joueurs.length; i++) {
            if (joueurs[i].id !== socket.id) {
                newJoueurs.push(joueurs[i]);
                newId.push(joueurs[i].id);
            }
        }
        joueurs = newJoueurs;
        if (joueurs.length < nbJoueursMax) {
            PartieCommencable = true;
        }
        id = newId;
        for (let i = 0; i < joueurs.length; i++) {
            joueurs[i].numero = i + 1;
        }
        io.emit('AllJoueurs', joueurs);
    }
});

function getVoisins(idHex, nbLignes, nbColonnes) {
    const ligne = Math.floor(idHex / nbColonnes);
    const colonne = idHex % nbColonnes;

    const voisins = [];
    const directions = [
        [-1, 0],  // Haut-gauche
        [-1, 1],  // Haut-droite
        [0, -1],  // Gauche
        [0, 1],   // Droite
        [1, -1],  // Bas-gauche
        [1, 0]    // Bas-droite
    ];

    directions.forEach(([dx, dy]) => {
        const newLigne = ligne + dx;
        const newColonne = colonne + dy;

        if (newLigne >= 0 && newLigne < nbLignes && newColonne >= 0 && newColonne < nbColonnes) {
            voisins.push(newLigne * nbColonnes + newColonne);
        }
    });

    return voisins;
}

function verifierVictoire(joueurId, tableau, nbLignes, nbColonnes) {
    const visited = new Set();

    function dfs(hexId) {
        if (visited.has(hexId)) return false;
        visited.add(hexId);

        // Si l'hexagone appartient au bord opposé, victoire
        if ((joueurId === 0 && Math.floor(hexId / nbColonnes) === nbLignes - 1) ||
            (joueurId === 1 && hexId % nbColonnes === nbColonnes - 1)) {
            return true;
        }

        // Parcourt les voisins
        for (const voisin of getVoisins(hexId, nbLignes, nbColonnes)) {
            if (tableau[voisin] === joueurId && dfs(voisin)) {
                return true;
            }
        }

        return false;
    }

    // Recherche les hexagones du bord de départ
    const bords = (joueurId === 0 ? [...Array(nbColonnes).keys()] : [...Array(nbLignes).keys()].map(l => l * nbColonnes));

    return bords.some(startHex => tableau[startHex] === joueurId && dfs(startHex));
}
