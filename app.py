from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import uuid
import csv
import io

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
    role = data.get('role') 
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
            if cursor.fetchone()['qtd'] >= 2:
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
    
    if novo_estado == 'Doing' and not task['data_real_inicio']:
        sql += ", data_real_inicio = NOW()"
    elif novo_estado == 'Done':
        sql += ", data_real_fim = NOW()"
    
    sql += " WHERE id = %s"
    cursor.execute(sql, (novo_estado, tid))
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
    cur.execute("SELECT id FROM users WHERE username = %s", (data['username'],))
    if cur.fetchone():
        conn.close()
        return jsonify({'error': 'Username já existe'}), 400

    new_id = str(uuid.uuid4())
    sql = "INSERT INTO users (id, username, password, display_name, role, gestor_id) VALUES (%s, %s, %s, %s, %s, %s)"
    val = (new_id, data['username'], data.get('password', '123456'), 
           data.get('displayName', data['username']), data['role'], data.get('gestorId'))
    cur.execute(sql, val)
    conn.commit()
    conn.close()
    return jsonify({'id': new_id}), 201

# ==============================================================================
# NOVOS ENDPOINTS - RELATÓRIOS E ESTATÍSTICAS (REQUISITOS 25-29)
# ==============================================================================

# REQUISITO 27: Listagem de Tarefas em Curso com Cálculos de Atraso
@app.route('/api/reports/manager/pending', methods=['GET'])
def report_manager_pending():
    gestor_id = request.args.get('gestorId')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Seleciona tarefas não concluídas e junta com o nome do programador
    query = """
        SELECT t.descricao, t.estado, u.username as programador, t.data_prevista_fim, t.ordem
        FROM tasks t
        LEFT JOIN users u ON t.programador_id = u.id
        WHERE t.gestor_id = %s AND t.estado != 'Done'
        ORDER BY t.estado DESC, t.ordem ASC
    """
    cursor.execute(query, (gestor_id,))
    tasks = cursor.fetchall()
    conn.close()

    report = []
    now = datetime.now()
    for t in tasks:
        falta = 0
        atraso = 0
        # Lógica de cálculo de dias (Backend)
        if t['data_prevista_fim']:
            delta = (t['data_prevista_fim'] - now).days
            if delta < 0:
                atraso = abs(delta)
            else:
                falta = delta
        
        report.append({
            'descricao': t['descricao'],
            'estado': t['estado'],
            'ordem': t['ordem'],
            'programador': t['programador'],
            'diasFalta': falta,
            'diasAtraso': atraso
        })
    return jsonify(report)

# REQUISITO 25 e 26: Tarefas Concluídas (Programador e Gestor)
@app.route('/api/reports/completed', methods=['GET'])
def report_completed():
    user_id = request.args.get('userId')
    role = request.args.get('role')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    if role == 'Programador':
        # Req 25: Apenas as tarefas do programador
        query = "SELECT * FROM tasks WHERE programador_id = %s AND estado = 'Done'"
    else:
        # Req 26: Todas as tarefas criadas pelo gestor
        query = """
            SELECT t.*, u.username as programador_nome 
            FROM tasks t LEFT JOIN users u ON t.programador_id = u.id
            WHERE t.gestor_id = %s AND t.estado = 'Done'
        """
    
    cursor.execute(query, (user_id,))
    tasks = cursor.fetchall()
    conn.close()
    
    report = []
    for t in tasks:
        duracao = 0
        if t['data_real_inicio'] and t['data_real_fim']:
            diff = (t['data_real_fim'] - t['data_real_inicio']).days
            duracao = diff if diff > 0 else 1 # Assume pelo menos 1 dia
        
        # Req 26: Desvio (Real vs Previsto)
        diff_previsto = 0
        if role == 'Gestor' and t['data_prevista_inicio'] and t['data_prevista_fim']:
             dias_previstos = (t['data_prevista_fim'] - t['data_prevista_inicio']).days
             dias_previstos = dias_previstos if dias_previstos > 0 else 1
             diff_previsto = duracao - dias_previstos

        report.append({
            'descricao': t['descricao'],
            'duracaoReal': duracao,
            'programador': t.get('programador_nome'),
            'desvio': diff_previsto
        })
    return jsonify(report)

# REQUISITO 28: Algoritmo de Previsão baseado em Story Points
@app.route('/api/stats/prediction', methods=['GET'])
def prediction_algorithm():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # 1. Calcular média de dias por StoryPoint (Tarefas Done)
    cursor.execute("SELECT story_points, data_real_inicio, data_real_fim FROM tasks WHERE estado = 'Done' AND story_points > 0")
    done_tasks = cursor.fetchall()
    
    sp_stats = {} 
    for t in done_tasks:
        if t['data_real_inicio'] and t['data_real_fim']:
            days = (t['data_real_fim'] - t['data_real_inicio']).days
            days = days if days > 0 else 1
            sp = t['story_points']
            if sp not in sp_stats: sp_stats[sp] = []
            sp_stats[sp].append(days)
            
    avg_per_sp = {k: sum(v)/len(v) for k, v in sp_stats.items()}
    
    # 2. Somar estimativa para tarefas ToDo
    cursor.execute("SELECT story_points FROM tasks WHERE estado = 'ToDo'")
    todo_tasks = cursor.fetchall()
    conn.close()
    
    total_days = 0
    available_sps = list(avg_per_sp.keys())
    
    for t in todo_tasks:
        sp = t['story_points'] or 0
        if sp == 0: continue
        
        if sp in avg_per_sp:
            total_days += avg_per_sp[sp]
        elif available_sps:
            # Algoritmo de aproximação (Req 28)
            nearest = min(available_sps, key=lambda x: abs(x - sp))
            total_days += avg_per_sp[nearest]
        else:
            total_days += 1 # Valor default
            
    return jsonify({'totalDays': round(total_days, 1)})

# REQUISITO 29: Exportar CSV
@app.route('/api/reports/export/csv', methods=['GET'])
def export_csv():
    gestor_id = request.args.get('gestorId')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.username, t.descricao, t.data_prevista_inicio, t.data_prevista_fim, 
               tp.name as tipo, t.data_real_inicio, t.data_real_fim
        FROM tasks t
        LEFT JOIN users u ON t.programador_id = u.id
        LEFT JOIN task_types tp ON t.tipo_id = tp.id
        WHERE t.gestor_id = %s AND t.estado = 'Done'
    """, (gestor_id,))
    tasks = cursor.fetchall()
    conn.close()

    si = io.StringIO()
    cw = csv.writer(si, delimiter=';')
    cw.writerow(['Programador', 'Descricao', 'DataPrevistaInicio', 'DataPrevistaFim', 'Tipo', 'DataRealInicio', 'DataRealFim'])
    
    for t in tasks:
        cw.writerow([
            t['username'], t['descricao'], t['data_prevista_inicio'], t['data_prevista_fim'],
            t['tipo'], t['data_real_inicio'], t['data_real_fim']
        ])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=relatorio.csv"
    output.headers["Content-type"] = "text/csv"
    return output

if __name__ == '__main__':
    app.run(debug=True, port=5000)