

# SIMPL: Indonesian Mini Programming Language
`simpl` adalah bahasa pemrograman mini yang berbasis dari bahasa Indonesia. Bahasa ini dirancang untuk memudahkan penerjemahan berbagai konsep pemrograman ke dalam bahasa Indonesia. Selain itu, semua kata kunci (_keywords_) dari bahasa ini memiliki jumlah karakter persis 5 huruf untuk alasan estetika :)

SIMPL adalah akronim rekursif dari SIMPL: Indonesian Mini Programming Language :D

## Fitur 
`simpl` **masih dalam tahap pengembangan!** Jadi, semua yang tertera disini akan berubah sewaktu-waktu!

Berikut fitur yang _sekarang_ sudah diimplementasikan:
- Bahasa pemrograman mini yang diinterpretasi JavaScript
- Pengecekan Tipe yang kuat (saat _runtime_)
- Mendukung fitur pemrograman fungsional (_first-class_, _closure_)
- Mendukung pembuatan Tipe melalui `model` (_struct_) dan `jenis` (_enum_)
- **Semua** kata kunci berjumlah 5 huruf dan dalam bahasa Indonesia

Fitur yang akan datang:
- Website untuk menjalankan `simpl`
- dokumentasi penuh
- Pembersihan dan perapihan kode sumber :')
- Pengecekan sebelum eksekusi (Analisa semantik)
- Pe`masuk`an input ke program
- Pengendalian `error`
- `impor` dan `expor`
- bytecode...
- dan fitur lainnya yang tidak terpikirkan sekarang :)

## Contoh Minimal
Tur bahasa yang lengkap ada dalam [Tur Sintaksis](docs/tur)
### Kapabilitas pemrograman sederhana
- Kalimat ikonik
```simpl
cetak "Halo, dunia!"
```

- `mesin` pencetak uang
```simpl
mesin pencetakUang ==> () {
	cetak "uang"
}
```
- `mesin` akar dua
```simpl
mesin akar2 ==> (angka n) {
	angka TOLERANSI = 0.0000000000000000001
	mesin abs ==> (angka a) {
		kalau a < 0 { hasil -a }
		hasil a
	}
	mesin rata2 ==> (angka a, angka b) { hasil (a+b)/2 }
	
	# menebak dengan metode newton
	angka tebakan = 0
	angka selanjutnya = 1
	slagi abs(tebakan - selanjutnya) > TOLERANSI {
		rubah tebakan = selanjutnya
		rubah selanjutnya = rata2(tebakan, n/tebakan)
	}
	hasil tebakan
}
```

### Kapabitilas pemrograman fungsional
`simpl` mendukung `mesin` (yaitu fungsi) sebagai tipe data yang bisa dimanipulasikan seperti data lainnya
```simpl
mesin map ==> (mesin f, baris masukan) {
	baris keluaran = []
	untuk datum d dalam masukan {
	  rubah keluaran = keluaran + [f(d)]
	}
	hasil keluaran
}

mesin ganda ==> (mesin f) {
	hasil => (datum a) { hasil f(f(a)) } 
}

baris contoh = [1,2,3,4,5]
mesin kuadrat ==> (angka n) { hasil n*n }

cetak ganda(kuadrat)(10)
# 10000

cetak map(ganda(kuadrat), contoh) 
# [ 1, 16, 81, 256, 625 ]
 
```
### Kapabilitas permodelan data
`simpl` mendukung  pemodelan Tipe data lebih kompleks dengan `model`
```simpl
model Pengguna (
	petik nama,
	angka id,
	Status status
)

modul Pengguna {
	jenis Status ( online, offline, rahasia )
	angka jumlahPengguna = 0
	mesin baru ==> (petik nama) {
		Pengguna akunBaru = Pengguna(
			nama, 
			jumlahPengguna, 
			Status.online
		)
		rubah jumlahPengguna = jumlahPengguna + 1
		hasil akunBaru
	}
	mesin kePetik ==> (Pengguna p) {
		petik status = ""
		kalau p.status == Status.online { 
			rubah status = "online" 
		} namun kalau p.status == Status.offline {
			rubah status = "offline" 
		} namun { 
			rubah status = "rahasia" 
		}
		hasil
			"{ nama: " + p.nama +
			", id: " + petik(p.id) +
			", status: " + status + " }"
	}
}

Pengguna admin = Pengguna.baru("zie")
Pengguna lain = Pengguna.baru("Hengker Anongnimus")

cetak Pengguna.kepetik(admin)
# "{ nama: zie, id: 0, status: online }"

cetak Pengguna.kePetik(lain)
# "{ nama: Hengker Anongnimus, id: 1, status: online }"
```

