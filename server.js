import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config()

const app = express();

app.use(express.json());

const users = [];

const alunos = [
    {
        id: 1,
        nome: "Asdrubal",
        ra: "11111",
        nota1: 8.5,
        nota2: 9.5
    },
    {
        id: 2,
        nome: "Lupita",
        ra: "22222",
        nota1: 7.5,
        nota2: 7
    },
    {
        id: 3,
        nome: "Zoroastro",
        ra: "33333",
        nota1: 3,
        nota2: 4
    }
];


//rotas usuarios


//post/register

app.post('/register', async(req,res) => {

    const {username, password} = req.body;

    const hashedPassword = await bcrypt.hash(password,10);

    users.push({username, password: hashedPassword});
    console.log(users);

    res.status(201).json({mensagem: 'Usuario Registrado'});
});

//post/login

app.post('/login', async(req,res) => {

    const {username, password} = req.body;
    const user = users.find(user => user.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({mensagem:'Login Incorreto!'});
    }

    const token = jwt.sign(
        { username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({ jwt: token});

    console.log('Login efetuado pelo usuário ' + user.username);
});



//verificando o token

const authenticateJWT = (req, res, next) => {

   
    const authHeader = req.header('Authorization');
    console.log('Authorization: ' + authHeader);

    let token;

    if (authHeader) {
        const parts = authHeader.split(' ');

        if (parts.length === 2) {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            mensagem: 'Acesso negado. Token não fornecido.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    mensagem: 'Acesso negado. Token expirado.'
                });

            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({
                    mensagem: 'Acesso negado. Token inválido.'
                });

            } else {
                return res.status(403).json({
                    mensagem: 'Acesso negado. Erro na verificação do token.'
                });
            }
        }

        req.user = user;

        const issuedAtISO = new Date(user.iat * 1000).toISOString();
        const expiresAtISO = new Date(user.exp * 1000).toISOString();

        console.log(`Token validado para usuário: ${user.username}
        Emitido em: ${issuedAtISO}
        Expira em: ${expiresAtISO}
        `);

        next();
    });
};






//rotas alunos

//  get/alunos

app.get('/alunos', authenticateJWT, (req, res) => {
    res.json(alunos);
});



//get/alunos/medias

app.get('/alunos/medias', authenticateJWT, (req, res) => {

    const medias = alunos.map(aluno => ({
        nome: aluno.nome,
        media: (aluno.nota1 + aluno.nota2) / 2
    }));

    res.json(medias);
});

//get/alunos/aprovados

app.get('/alunos/aprovados', authenticateJWT, (req, res) => {

    const aprovados = alunos.map(aluno => ({
        nome: aluno.nome,
        situacao: ((aluno.nota1 + aluno.nota2) / 2) >= 6
            ? 'aprovado'
            : 'reprovado'
    }));

    res.json(aprovados);
});


//get/alunos/:id

app.get('/alunos/:id', authenticateJWT, (req, res) => {

    const id = parseInt(req.params.id);

    const aluno = alunos.find(aluno => aluno.id === id);

    if (!aluno) {
        return res.status(404).json({
            mensagem: 'Aluno não encontrado'
        });
    }

    res.json(aluno);
});


//post/alunos

app.post('/alunos', authenticateJWT, (req, res) => {

    const { nome, ra, nota1, nota2 } = req.body;

    if (!nome || !ra || nota1 === undefined || nota2 === undefined) {
        return res.status(400).json({
            mensagem: 'Todos os campos são obrigatórios'
        });
    }

    if (
        typeof nome !== 'string' ||
        typeof ra !== 'string' ||
        typeof nota1 !== 'number' ||
        typeof nota2 !== 'number'
    ) {
        return res.status(400).json({
            mensagem: 'Tipos de dados inválidos'
        });
    }

    const novoAluno = {
        id: alunos.length > 0 ? Math.max(...alunos.map(aluno => aluno.id)) + 1 : 1,
        nome,
        ra,
        nota1,
        nota2
    };

    alunos.push(novoAluno);

    res.status(201).json(novoAluno);
});

// put/alunos/:id

app.put('/alunos/:id', authenticateJWT, (req, res) => {

    const id = parseInt(req.params.id);

    const aluno = alunos.find(aluno => aluno.id === id);

    if (!aluno) {
        return res.status(404).json({
            mensagem: 'Aluno não encontrado'
        });
    }

    const { nome, ra, nota1, nota2 } = req.body;

    if (!nome || !ra || nota1 === undefined || nota2 === undefined) {
        return res.status(400).json({
            mensagem: 'Todos os campos são obrigatórios'
        });
    }

    if (
        typeof nome !== 'string' ||
        typeof ra !== 'string' ||
        typeof nota1 !== 'number' ||
        typeof nota2 !== 'number'
    ) {
        return res.status(400).json({
            mensagem: 'Tipos de dados inválidos'
        });
    }

    aluno.nome = nome;
    aluno.ra = ra;
    aluno.nota1 = nota1;
    aluno.nota2 = nota2;

    res.json(aluno);
});


//delete/alunos/:id

app.delete('/alunos/:id', authenticateJWT, (req, res) => {

    const id = parseInt(req.params.id);

    const indice = alunos.findIndex(aluno => aluno.id === id);

    if (indice === -1) {
        return res.status(404).json({
            mensagem: 'Aluno não encontrado'
        });
    }

    alunos.splice(indice, 1);

    res.json({
        mensagem: 'Aluno excluído com sucesso'
    });
});



// rotas de teste

app.get('/protected', authenticateJWT, (req, res) => {

    console.log("Usuário autorizado: " + req.user.username);

    res.json({
        mensagem: 'Você conseguiu acessar uma rota protegida'
    });
});


//listen
app.listen(3000, () => {
    console.log("Servidor ativo e aguardando requisições...");
});