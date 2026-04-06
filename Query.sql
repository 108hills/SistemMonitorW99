DROP TABLE IF EXISTS users, produk, transaksi, laporan;

-- TABLE USER
CREATE TABLE users (
   id_user SERIAL PRIMARY KEY,
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
      ON DELETE CASCADE
      ON UPDATE CASCADE,
   CONSTRAINT fk_transaksi_user
      FOREIGN KEY (id_user)
   	REFERENCES users(id_user)
      ON DELETE SET NULL
      ON UPDATE CASCADE
);

-- insert
INSERT INTO users (username, password, nama, role) VALUES
('p1', 'pass1', 'Ahmad Kadhim', 'admin'),
('p2', 'pass2', 'Muhammad Sheva Wardhana', 'admin'),
('p3', 'pass3', 'Hamad Dafala', 'koki'),
('p4', 'pass4', 'Hamad Dafaluy', 'koki'),
('p5', 'pass5', 'Ahmad Kadhuy', 'koki'),
('p6', 'pass6', 'Andi Imran', 'admin'),
('p7', 'pass7', 'Andi Imruy', 'kasir'),
('p8', 'pass8', 'Fadhil Syahda Andira', 'koki'),
('p9', 'pass9', 'Fadhuy', 'kasir'),
('p10', 'pass10', 'Fadlurrahman Azra', 'kasir');

INSERT INTO produk (nama_produk, stok, id_user) VALUES
('Nasi Goreng Spesial', 50, 1),
('Mie Goreng Seafood', 40, 2),
('Ayam Bakar Madu', 35, 3),
('Nasi Goreng Octa', 60, 4),
('Es Teh Arsha Manis', 100, 5),
('Kopi Susu Gula Tanpa Aren', 80, 6),
('Buah Alpukat', 30, 7),
('Mie Goreng Kadhim', 25, 8),
('Kentang Goreng', 45, 9),
('Dimsum Ayam', 40, 10);

INSERT INTO transaksi (tanggal, jenis_transaksi, jumlah, id_produk, id_user) VALUES
('2026-04-01', 'PRODUK BARU', 2, 1, 3),
('2026-04-01', 'MASUK', 5, 2, 4),
('2026-04-02', 'KELUAR', 1, 3, 5),
('2026-04-02', 'KELUAR', 3, 4, 6),
('2026-04-03', 'PRODUK BARU', 2, 5, 7),
('2026-04-03', 'MASUK', 10, 6, 8),
('2026-04-04', 'MASUK', 4, 7, 9),
('2026-04-04', 'KELUAR', 6, 8, 10),
('2026-04-05', 'KELUAR', 2, 9, 3),
('2026-04-05', 'MASUK', 1, 10, 4);