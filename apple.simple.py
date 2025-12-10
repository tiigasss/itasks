# apple.simple.py
# Backend Completo iTasks - Compatível com o novo Frontend HTML
import sqlite3
import datetime
import io
import csv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
# Permite pedidos de qualquer origem (essencial para funcionar com o teu HTML local)
CORS(app) 

DB_NAME = "itasks.db"

# --- CONFIGURAÇÃO DA BASE DE DADOS (SQLite) ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Tabela Users
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        type TEXT NOT NULL,
        department TEXT,
        experience_level TEXT,
        manager_id INTEGER,
        manages_users INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(manager_id) REFERENCES users(id)
    )''')

    # Tabela Task Types
    c.execute('''CREATE TABLE IF NOT EXISTS task_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )''')

    # Tabela Tasks
    c.execute('''CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        story_points INTEGER DEFAULT 1,
        state TEXT DEFAULT 'ToDo',
        order_num INTEGER DEFAULT 1,
        predicted_start_date TEXT,
        predicted_end_date TEXT,
        real_start_date TEXT,
        real_end_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        programmer_id INTEGER,
        manager_id INTEGER,
        type_id INTEGER,
        FOREIGN KEY(programmer_id) REFERENCES users(id),
        FOREIGN KEY(manager_id) REFERENCES users(id),
        FOREIGN KEY(type_id) REFERENCES task_types(id)
    )''')
    
    # Inserir dados iniciais se a tabela estiver vazia
    check = c.execute("SELECT count(*) FROM users").fetchone()[0]
    if check == 0:
        # Admin
        c.execute("INSERT INTO users (name, email, password, type, department, manages_users) VALUES (?, ?, ?, ?, ?, ?)",
                  ('Admin Gestor', 'admin', '123', 'Gestor', 'IT', 1))
        # Programadores
        c.execute("INSERT INTO users (name, email, password, type, department, experience_level, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  ('João Silva', 'joao', '123', 'Programador', 'IT', 'Junior', 1))
        
        # Tipos de Tarefa
        types = ['Bug', 'Feature', 'Refactor', 'Meeting']
        for t in types:
            c.execute("INSERT INTO task_types (name) VALUES (?)", (t,))
            
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row # Permite aceder às colunas por nome
    return conn

# --- ENDPOINTS DE AUTENTICAÇÃO ---

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    # O HTML envia 'username', mas na DB guardamos como 'email'
    user = conn.execute("SELECT * FROM users WHERE email = ? AND password = ?", 
                        (data.get('username'), data.get('password'))).fetchone()
    conn.close()
    
    if user:
        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "type": user["type"],
                "department": user["department"]
            }
        })
    return jsonify({"success": False, "message": "Credenciais inválidas"}), 401

# --- ENDPOINTS DE TAREFAS (KANBAN & FORM) ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db()
    # Join para obter nomes legíveis para o Kanban
    query = '''
        SELECT t.*, u.name as programmer_name, tp.name as type_name 
        FROM tasks t
        LEFT JOIN users u ON t.programmer_id = u.id
        LEFT JOIN task_types tp ON t.type_id = tp.id
        ORDER BY t.order_num ASC
    '''
    tasks = conn.execute(query).fetchall()
    conn.close()
    
    # Converter para lista de dicionários
    result = []
    for t in tasks:
        result.append({
            "id": t["id"],
            "title": t["title"],
            "description": t["description"],
            "state": t["state"],
            "order_num": t["order_num"],
            "story_points": t["story_points"],
            "predicted_end_date": t["predicted_end_date"],
            "programmer_id": t["programmer_id"],
            "programmer_name": t["programmer_name"],
            "type_name": t["type_name"]
        })
    return jsonify(result)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    conn = get_db()
    
    # Validação de Ordem Única (Regra 17)
    # Verifica se já existe uma tarefa com a mesma ordem para o mesmo programador (exceto se já estiver concluída)
    exists = conn.execute('''
        SELECT id FROM tasks 
        WHERE programmer_id = ? AND order_num = ? AND state != 'Done'
    ''', (data['programmer_id'], data['order_num'])).fetchone()
    
    if exists:
        conn.close()
        return jsonify({"success": False, "message": "Já existe uma tarefa com essa ordem para este programador."}), 400

    try:
        conn.execute('''
            INSERT INTO tasks (title, description, type_id, story_points, programmer_id, order_num, predicted_start_date, predicted_end_date, manager_id, state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ToDo')
        ''', (
            data['title'], data['description'], data['type_id'], data['story_points'],
            data['programmer_id'], data['order_num'], data['predicted_start_date'],
            data['predicted_end_date'], data['manager_id']
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/tasks/<int:task_id>/move', methods=['POST'])
def move_task(task_id):
    data = request.json
    new_state = data.get('state')
    user_id = data.get('user_id') # Quem está a mover
    
    conn = get_db()
    task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    
    if not task:
        conn.close()
        return jsonify({"success": False, "message": "Tarefa não encontrada"}), 404
        
    current_state = task['state']
    prog_id = task['programmer_id']
    order_num = task['order_num']
    
    # Regra 14: Done não mexe
    if current_state == 'Done':
        conn.close()
        return jsonify({"success": False, "message": "Tarefas Done estão fechadas."}), 400

    # MOVIMENTO PARA DOING
    if new_state == 'Doing':
        # Regra 15: Máximo 2 em Doing
        doing_count = conn.execute("SELECT COUNT(*) FROM tasks WHERE programmer_id = ? AND state = 'Doing'", (prog_id,)).fetchone()[0]
        if doing_count >= 2:
            conn.close()
            return jsonify({"success": False, "message": "O programador já tem 2 tarefas em curso."}), 400
            
        # Regra 16: Ordem Sequencial
        # Verifica se existe alguma tarefa em ToDo com ordem menor que a atual
        lower_order = conn.execute('''
            SELECT id FROM tasks 
            WHERE programmer_id = ? AND state = 'ToDo' AND order_num < ?
        ''', (prog_id, order_num)).fetchone()
        
        if lower_order:
            conn.close()
            return jsonify({"success": False, "message": f"Deve completar as tarefas anteriores (Ordem < {order_num}) primeiro."}), 400
            
        # Atualiza Data Real Inicio
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute("UPDATE tasks SET state = ?, real_start_date = ? WHERE id = ?", (new_state, now, task_id))

    # MOVIMENTO PARA DONE
    elif new_state == 'Done':
        if current_state != 'Doing':
            conn.close()
            return jsonify({"success": False, "message": "A tarefa deve estar em Doing antes de passar a Done."}), 400
            
        # Atualiza Data Real Fim
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute("UPDATE tasks SET state = ?, real_end_date = ? WHERE id = ?", (new_state, now, task_id))
    
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# --- ENDPOINTS AUXILIARES (DROPDOWNS) ---

@app.route('/api/programmers', methods=['GET'])
def get_programmers():
    conn = get_db()
    # Retorna apenas programadores
    users = conn.execute("SELECT id, name, experience_level FROM users WHERE type = 'Programador'").fetchall()
    conn.close()
    result = [{"id": u["id"], "name": u["name"], "experience_level": u["experience_level"]} for u in users]
    return jsonify(result)

@app.route('/api/task-types', methods=['GET'])
def get_types():
    conn = get_db()
    types = conn.execute("SELECT * FROM task_types").fetchall()
    conn.close()
    result = [{"id": t["id"], "name": t["name"]} for t in types]
    return jsonify(result)

# --- ENDPOINTS DE GESTÃO DE UTILIZADORES ---

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    users = conn.execute("SELECT id, name, email, type, department, experience_level FROM users").fetchall()
    conn.close()
    result = [dict(u) for u in users]
    return jsonify(result)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    conn = get_db()
    try:
        conn.execute('''
            INSERT INTO users (name, email, password, type, department, experience_level, manages_users)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'], data['email'], data['password'], data['type'], 
            data.get('department'), data.get('experience_level'), data.get('manages_users', 0)
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"success": False, "message": "Email/Username já existe"}), 400

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# --- ENDPOINT DE RELATÓRIOS (CSV) ---

@app.route('/api/reports/csv', methods=['GET'])
def download_csv():
    conn = get_db()
    # Regra 29: Exportar tarefas concluídas com os campos específicos
    query = '''
        SELECT u.name as Programador, t.description as Descricao, 
               t.predicted_start_date as DataPrevistaInicio, t.predicted_end_date as DataPrevistaFim,
               tp.name as TipoTarefa, t.real_start_date as DataRealInicio, t.real_end_date as DataRealFim
        FROM tasks t
        JOIN users u ON t.programmer_id = u.id
        JOIN task_types tp ON t.type_id = tp.id
        WHERE t.state = 'Done'
    '''
    rows = conn.execute(query).fetchall()
    conn.close()
    
    # Criar CSV em memória
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';') # CSV Excel friendly na Europa
    
    # Cabeçalho
    writer.writerow(['Programador', 'Descricao', 'DataPrevistaInicio', 'DataPrevistaFim', 'TipoTarefa', 'DataRealInicio', 'DataRealFim'])
    
    for row in rows:
        writer.writerow(list(row))
        
    output.seek(0)
    
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')), # UTF-8 com BOM para Excel abrir bem os acentos
        mimetype='text/csv',
        as_attachment=True,
        download_name='tarefas_concluidas.csv'
    )

if __name__ == '__main__':
    init_db()
    print("Base de dados 'itasks.db' verificada/criada.")
    print("Servidor a correr em http://localhost:5000")
    app.run(debug=True, port=5000)