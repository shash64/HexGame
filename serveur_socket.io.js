// A faire, ligne 35 (?) et 47 jusqu'à la fin.



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

io.on('connection', (socket) => { //Lorsqu'une connexion au serveur est détéctée (ouverture de la page par un utilisateur)
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
                io.emit('AllJoueurs',joueurs); //On renvoie côté client la liste des joueurs pour l'afficher en HTML
                callback({sucess: true, message : "La partie est prete a etre lancee"}); //On renvoie un succes: true avec un message de succès
            }else{ //Sinon
                io.emit('AllJoueurs',joueurs); //On renvoie côté client la liste des joueurs pour l'afficher en HTML
                callback({success:true}); //On renvoie un succes: true sans message
            }

        }
    });

    socket.on('onClickHex', (data) => {
        if(idHexagone.includes(data)){
            console.log("essai d'un hexagone déja cliqué");
        }
        else{
            for (let i =0; i<joueurs.length;i++){
                if(joueurs[i].id===socket.id&&(nbCoups%nbJoueursMax)==i){
                    idHexagone.push(data);
                    nbCoups++;
                    io.emit('affichageHex',{nomProchainJoueur: joueurs[(i+1)%2].nom, idHex:data, col: (joueurs[i].numero)-1});
                }
            }

        } 
    });

    socket.on('envoyerMessage', (message) =>{
        for (let i =0; i<joueurs.length;i++){
            if(joueurs[i].id===socket.id){
                io.emit('nouveauMessage',{nom: joueurs[i].nom, message, col: (joueurs[i].numero)-1});}
        }
    });

    socket.on('deco',()=> {
        deconnexion();
    })

    socket.on('disconnect',() => {
        deconnexion();
    })

    socket.on('commencerPartie',() => {
        if(joueurs.length==nbJoueursMax){
            io.emit('commencerPartie')
            idHexagone = [];
            nbCoups = 0;
        }
    })



    function deconnexion(){
        console.log("un joueur est decconecté", socket.id);
        let newjoueurs = [];
        let newid = [];
        for (let i =0; i<joueurs.length;i++){
            if(joueurs[i].id!==socket.id){
                newjoueurs.push(joueurs[i]);
                newid.push(joueurs[i].id);
            }
        }
        joueurs=newjoueurs;
        id = newid;
        for (let i =0; i<joueurs.length;i++){
            joueurs[i].numero=i+1;
        }
        io.emit('AllJoueurs', joueurs);
    }


});
