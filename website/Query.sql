DROP TABLE IF EXISTS transaksi CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- TABLE USER
CREATE TABLE users (
   id_user SERIAL PRIMARY KEY,
   profile_url TEXT,
   username VARCHAR(50) NOT NULL,
   password VARCHAR(100) NOT NULL,
   nama VARCHAR(100),
   role VARCHAR(50)
);

-- TABLE PRODUK
CREATE TABLE produk (
    id_produk SERIAL PRIMARY KEY,
    nama_produk VARCHAR(100) NOT NULL,
    stok INT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    id_user INT,
    CONSTRAINT fk_produk_user
        FOREIGN KEY (id_user)
        REFERENCES users(id_user)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- TABLE TRANSAKSI
CREATE TABLE transaksi (
   id_transaksi SERIAL PRIMARY KEY,
   tanggal DATE NOT NULL,
   jenis_transaksi VARCHAR(50),
   jumlah INT NOT NULL,
   id_produk INT,
   id_user INT,
   CONSTRAINT fk_transaksi_produk
      FOREIGN KEY (id_produk)
      REFERENCES produk(id_produk)
      
INSERT INTO users (username, password, nama, role) VALUES
('kadhim@warkop99.com', '123', 'Ahmad Kadhim', 'admin'),
('imran@warkop99.com', '12345', 'imrong', 'admin'),
('hamud@warkop99.com', 'hamudi', 'hamut', 'admin');