from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)


db_config = {
    'user': 'itasks',
    'password': 'admin123', 
    'host': 'localhost',
    'database': 'itasks_db'
}

def get_db():
    return mysql.connector.connect(**db_config)

# --- LOGIN ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (data['username'], data['password']))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({
            'user': {
                'id': user['id'],
                'username': user['username'],
                'displayName': user['display_name'],
                'role': user['role'],
                'gestorId': user['gestor_id']
            },
            'token': 'mock-token-123'
        })
    return jsonify({'error': 'Credenciais inválidas'}), 401

# --- TAREFAS (CRUD e Regras) ---
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM tasks ORDER BY ordem ASC")
    rows = cursor.fetchall()
    conn.close()
    
    tasks = []
    for r in rows:
        tasks.append({
            'id': r['id'],
            'descricao': r['descricao'],
            'tipoId': r['tipo_id'],
            'gestorId': r['gestor_id'],
            'programadorId': r['programador_id'],
            'ordem': r['ordem'],
            'estado': r['estado'],
            'dataCriacao': r['data_criacao'].isoformat() if r['data_criacao'] else None,
            'dataPrevistaInicio': r['data_prevista_inicio'].isoformat() if r['data_prevista_inicio'] else None,
            'dataPrevistaFim': r['data_prevista_fim'].isoformat() if r['data_prevista_fim'] else None,
            'dataRealInicio': r['data_real_inicio'].isoformat() if r['data_real_inicio'] else None,
            'dataRealFim': r['data_real_fim'].isoformat() if r['data_real_fim'] else None,
            'storyPoints': r['story_points']
        })
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Regra 17: Validar ordem única para o programador
    if data.get('programadorId'):
        cursor.execute("SELECT id FROM tasks WHERE programador_id = %s AND ordem = %s AND estado != 'Done'", 
                       (data['programadorId'], data.get('ordem')))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Já existe uma tarefa com essa ordem para este programador'}), 400

    new_id = str(uuid.uuid4())
    sql = """INSERT INTO tasks (id, descricao, tipo_id, gestor_id, programador_id, ordem, estado, story_points, data_criacao, data_prevista_inicio, data_prevista_fim)
             VALUES (%s, %s, %s, %s, %s, %s, 'ToDo', %s, NOW(), %s, %s)"""
    vals = (new_id, data['descricao'], data.get('tipoId'), data['gestorId'], data.get('programadorId'), 
            data.get('ordem', 1), data.get('storyPoints', 0), data.get('dataPrevistaInicio'), data.get('dataPrevistaFim'))
    
    cursor.execute(sql, vals)
    conn.commit()
    conn.close()
    return jsonify({'id': new_id}), 201

@app.route('/api/tasks/<tid>/move', methods=['PUT'])
def move_task(tid):
    data = request.json
    novo_estado = data['estado']
    role = data.get('role') # 'Gestor' ou 'Programador'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM tasks WHERE id = %s", (tid,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        return jsonify({'error': 'Tarefa não encontrada'}), 404

    # Regras de Negócio
    if role == 'Programador':
        # Regra 15: Max 2 tarefas em Doing
        if novo_estado == 'Doing':
            cursor.execute("SELECT COUNT(*) as qtd FROM tasks WHERE programador_id = %s AND estado = 'Doing'", (task['programador_id'],))
            count = cursor.fetchone()['qtd']
            if count >= 2:
                conn.close()
                return jsonify({'error': 'Limite de 2 tarefas em Doing atingido'}), 400
        
        # Regra 16 e 39: Ordem Sequencial Obrigatória
        if novo_estado in ['Doing', 'Done'] and task['estado'] == 'ToDo':
            cursor.execute("""
                SELECT MIN(ordem) as min_ordem FROM tasks 
                WHERE programador_id = %s AND estado = 'ToDo'
            """, (task['programador_id'],))
            res = cursor.fetchone()
            if res and res['min_ordem'] and task['ordem'] > res['min_ordem']:
                conn.close()
                return jsonify({'error': 'Deve executar as tarefas pela ordem sequencial definida (1, 2, ...)'}), 400

    # Atualização de Estado e Datas (Regra 19)
    sql = "UPDATE tasks SET estado = %s"
    params = [novo_estado]
    
    if novo_estado == 'Doing' and not task['data_real_inicio']:
        sql += ", data_real_inicio = NOW()"
    elif novo_estado == 'Done':
        sql += ", data_real_fim = NOW()"
    
    sql += " WHERE id = %s"
    params.append(tid)
    
    cursor.execute(sql, tuple(params))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

# --- GESTÃO DE TIPOS DE TAREFA ---
@app.route('/api/types', methods=['GET'])
def get_types():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM task_types")
    res = cur.fetchall()
    conn.close()
    return jsonify(res)

@app.route('/api/types', methods=['POST'])
def create_type():
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    new_id = str(uuid.uuid4())
    # Se não for enviada cor, usa verde como default
    cur.execute("INSERT INTO task_types (id, name, color) VALUES (%s, %s, %s)", 
                (new_id, data.get('name', 'Novo Tipo'), data.get('color', '#4ade80')))
    conn.commit()
    conn.close()
    return jsonify({'id': new_id}), 201

# --- GESTÃO DE UTILIZADORES ---
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, username, display_name as displayName, role, gestor_id as gestorId FROM users")
    res = cur.fetchall()
    conn.close()
    return jsonify(res)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    
    # Validar duplicados (Regra 3: Username único)
    cur.execute("SELECT id FROM users WHERE username = %s", (data['username'],))
    if cur.fetchone():
        conn.close()
        return jsonify({'error': 'Username já existe'}), 400

    new_id = str(uuid.uuid4())
    # Nota: Em produção a password deve ser hashada!
    sql = "INSERT INTO users (id, username, password, display_name, role, gestor_id) VALUES (%s, %s, %s, %s, %s, %s)"
    val = (new_id, data['username'], data.get('password', '123456'), 
           data.get('displayName', data['username']), data['role'], data.get('gestorId'))
    
    cur.execute(sql, val)
    conn.commit()
    conn.close()
    return jsonify({'id': new_id}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)