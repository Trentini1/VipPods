// Inicialização do Firebase (Realtime Database + Authentication).
// Usado para sincronizar em tempo real, com todo mundo que visita o site,
// as alterações feitas no painel admin (preço, custo, estoque, foto).
const firebaseConfig = {
  apiKey: "AIzaSyDnREYagAY1Ch7Ds4ESioLcj0dGNGYOzfg",
  authDomain: "vippods-31af6.firebaseapp.com",
  databaseURL: "https://vippods-31af6-default-rtdb.firebaseio.com",
  projectId: "vippods-31af6",
  storageBucket: "vippods-31af6.firebasestorage.app",
  messagingSenderId: "732190812666",
  appId: "1:732190812666:web:d9fecf8d527897b1a4dc43",
};

firebase.initializeApp(firebaseConfig);

const firebaseDb = firebase.database();
const firebaseAuth = firebase.auth();
