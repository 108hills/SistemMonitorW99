import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app) 

DB_HOST = "localhost"
DB_NAME = "warkop99" 
DB_USER = "postgres" 
DB_PASS = "SatuDua3" 

def get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url:
        return psycopg2.connect(db_url)
    else:
        return psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT id_produk, nama_produk, stok, image_url FROM produk WHERE is_active = TRUE ORDER BY id_produk;')
        products = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products', methods=['POST'])
def add_product():
    try:
        data = request.json
        nama = data.get('nama_produk')
        stok = data.get('stok')
        image_url = data.get('image_url') 
        id_user = data.get('id_user', 1)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('INSERT INTO produk (nama_produk, stok, image_url, id_user) VALUES (%s, %s, %s, %s) RETURNING id_produk', (nama, stok, image_url, id_user))
        new_id = cur.fetchone()[0]
        
        cur.execute("INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) VALUES (CURRENT_DATE, 'PRODUK BARU', %s, %s, %s)", (stok, new_id, id_user))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/products/<int:id_produk>', methods=['PUT'])
def update_stock(id_produk):
    try:
        data = request.json
        new_stock = data.get('stok')
        id_user = data.get('id_user', 1) 
        new_image = data.get('image_url')
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT stok FROM produk WHERE id_produk = %s', (id_produk,))
        old_stock = cur.fetchone()[0]
        
        if new_image:
            cur.execute('UPDATE produk SET stok = %s, image_url = %s WHERE id_produk = %s', (new_stock, new_image, id_produk))
        else:
            cur.execute('UPDATE produk SET stok = %s WHERE id_produk = %s', (new_stock, id_produk))
        
        jenis_tx = f"UPDATE ({old_stock} -> {new_stock})"
        cur.execute("INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) VALUES (CURRENT_DATE, %s, %s, %s, %s)", (jenis_tx, new_stock - old_stock, id_produk, id_user))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/products/<int:id_produk>', methods=['DELETE'])
def delete_product(id_produk):
    try:
        data = request.json or {}
        id_user = data.get('id_user', 1) 
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) VALUES (CURRENT_DATE, 'DELETE', 0, %s, %s)", (id_produk, id_user))
        cur.execute('UPDATE produk SET is_active = FALSE WHERE id_produk = %s', (id_produk,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/alerts/low-stock', methods=['GET'])
def get_low_stock():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('''
            SELECT id_produk, nama_produk, stok, image_url 
            FROM produk 
            WHERE is_active = TRUE AND stok <= 5 
            ORDER BY stok ASC;
        ''')
        
        alerts = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT 
                t.tanggal, 
                t.jenis_transaksi, 
                t.jumlah, 
                CASE 
                    WHEN t.jenis_transaksi IN ('MASUK', 'KELUAR') THEN '-'
                    ELSE COALESCE(p.nama_produk, 'Produk Dihapus')
                END as nama_produk, 
                COALESCE(u.nama, 'Sistem') as user_nama,
                u.profile_url as user_avatar 
            FROM transaksi t
            LEFT JOIN produk p ON t.id_produk = p.id_produk
            LEFT JOIN users u ON t.id_user = u.id_user
            ORDER BY t.id_transaksi DESC;
        '''
        cur.execute(query)
        history = cur.fetchall()
        cur.close()
        conn.close()
        
        for row in history:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else 'Hari ini'
                
        return jsonify(history)
    except Exception as e:
        print(f"ERROR LOAD HISTORY: {e}") 
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:id_user>', methods=['GET'])
def get_user(id_user):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT nama, role, profile_url FROM users WHERE id_user = %s', (id_user,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "user": user})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:id_user>/profile_image', methods=['PUT'])
def update_profile_image(id_user):
    try:
        data = request.json
        image_url = data.get('profile_url')
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('UPDATE users SET profile_url = %s WHERE id_user = %s', (image_url, id_user))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
def update_password(user_id):
    try:
        data = request.json
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({"status": "error", "message": "Password lama dan baru wajib diisi!"}), 400
            
        # ================= VALIDASI KEAMANAN PASSWORD DI SISI BACKEND =================
        if len(new_password) < 8:
            return jsonify({"status": "error", "message": "Security Reject: Password baru minimal harus 8 karakter!"}), 400
        if not re.search(r"[A-Z]", new_password):
            return jsonify({"status": "error", "message": "Security Reject: Password baru harus mengandung minimal 1 huruf besar (A-Z)!"}), 400
        if not re.search(r"[a-z]", new_password):
            return jsonify({"status": "error", "message": "Security Reject: Password baru harus mengandung minimal 1 huruf kecil (a-z)!"}), 400
        if not re.search(r"[0-9]", new_password):
            return jsonify({"status": "error", "message": "Security Reject: Password baru harus mengandung minimal 1 angka (0-9)!"}), 400
        if not re.search(r"[^A-Za-z0-9]", new_password):
            return jsonify({"status": "error", "message": "Security Reject: Password baru harus mengandung minimal 1 karakter simbol khusus!"}), 400
        # ==============================================================================

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Cek apakah password lama benar
        cur.execute('SELECT password FROM users WHERE id_user = %s', (user_id,))
        user = cur.fetchone()
        
        # Perbaikan: Sesuaikan dengan hash
        if not user or not check_password_hash(user['password'], old_password):
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Password lama yang Anda masukkan salah!"}), 401
            
        hashed_password = generate_password_hash(new_password)
        cur.execute('UPDATE users SET password = %s WHERE id_user = %s', (hashed_password, user_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Password berhasil diperbarui."})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT id_user, nama, role, password FROM users WHERE username = %s', (data.get('username'),))
        user = cur.fetchone()

        # Diperbaiki: Pengecekan hash dan blok if-else yang benar
        if user and check_password_hash(user['password'], data.get('password')):
            cur.execute("INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_user) VALUES (CURRENT_DATE, 'MASUK', 0, %s)", (user['id_user'],))
            conn.commit()
            cur.close()
            conn.close()
            
            # Hapus field password sebelum dikirim ke frontend demi keamanan
            user.pop('password', None)
            return jsonify({"status": "success", "user": user})
        else:
            return jsonify({"status": "error", "message": "Email atau password tidak sesuai."}), 401
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        id_user = request.json.get('id_user')
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_user) VALUES (CURRENT_DATE, 'KELUAR', 0, %s)", (id_user,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error"}), 500

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        username = data.get('username')
        nama_lengkap = data.get('nama')
        new_password = data.get('new_password')
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT id_user FROM users WHERE username = %s AND LOWER(nama) = LOWER(%s)', (username, nama_lengkap))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Kombinasi Email dan Nama Lengkap tidak ditemukan atau tidak cocok!"}), 404
            
        if new_password:
            hashed_password = generate_password_hash(new_password)
            cur.execute('UPDATE users SET password = %s WHERE id_user = %s', (hashed_password, user['id_user']))
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"status": "success", "message": "Password berhasil diperbarui!"})
            
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Data cocok."})
            
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)