from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app) 

DB_HOST = "localhost"
DB_NAME = "warkop99" 
DB_USER = "postgres" 
DB_PASS = "SatuDua3" 

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

# --- GET: Fetch all products ---
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

# --- POST: Add a new product ---
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
        
        cur.execute('''
            INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) 
            VALUES (CURRENT_DATE, 'TAMBAH PRODUK', %s, %s, %s)
        ''', (stok, new_id, id_user))

        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Product added"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# --- PUT: Update stock & image ---
@app.route('/api/products/<int:id_produk>', methods=['PUT'])
def update_stock(id_produk):
    try:
        data = request.json
        new_stock = data.get('stok')
        id_user = data.get('id_user', 1) 
        new_image = data.get('image_url')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        if new_image:
            cur.execute('UPDATE produk SET stok = %s, image_url = %s WHERE id_produk = %s', (new_stock, new_image, id_produk))
        else:
            cur.execute('UPDATE produk SET stok = %s WHERE id_produk = %s', (new_stock, id_produk))
        
        cur.execute('''
            INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) 
            VALUES (CURRENT_DATE, 'UPDATE STOK/EDIT', %s, %s, %s)
        ''', (new_stock, id_produk, id_user))

        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Product updated"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# --- DELETE: Soft Remove a product ---
@app.route('/api/products/<int:id_produk>', methods=['DELETE'])
def delete_product(id_produk):
    try:
        data = request.json or {}
        id_user = data.get('id_user', 1) 
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) 
            VALUES (CURRENT_DATE, 'HAPUS PRODUK', 0, %s, %s)
        ''', (id_produk, id_user))
        
        cur.execute('UPDATE produk SET is_active = FALSE WHERE id_produk = %s', (id_produk,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "success", "message": "Product soft-deleted, log perfectly preserved"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# --- POST: Verify Login ---
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT id_user, nama, role FROM users WHERE username = %s AND password = %s', (username, password))
        user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if user:
            return jsonify({"status": "success", "message": "Login successful", "user": user})
        else:
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)