# Tur Sintaks

`simpl` masih dalam tahap pengembangan, jadi apapun yang tertera disini mungkin saja berubah sewaktu-waktu.
## Cetak ke layar
```simpl
cetak "Halo, dunia!"
```
## Komentar
```simpl
# Tanda pagar mengabaikan hal didepannya sampai baris selanjutnya
```
## Tipe primitif
```simpl
petik nama = "zie"
angka umur = 18
logis sehat? = salah 
baris albumFavorit = ["The Powers That B", "Ants From Up There"]
mesin pencetakUang ==> () { cetak "Uang" }
```
## Operasi (hanya dengan tipe yang sama)
```simpl
petik user = "user" + "#123"    		# "user#123"
angka sisa = 10 / -4            		# -2.5
logis tidakSehat? = !salah	     		# benar
petik id = user[-3] + user[-2] + user[-1]	# "123"
```
## Konversi Tipe Primitif
```simpl
petik a = "100"
angka b = angka(a) + 1
petik c = petik(b)				# "101"
```
## Variabel Isi Bebas
```simpl
datum apa = 10
datum aja = "any"
datum boleh = [benar, "benar", 1]
datum kecualiIni = apa + aja + boleh    # Error! angka + petik + baris
```
## Perubahan variabel
```simpl
angka hitung = 0
rubah hitung = hitung + 1
```
## Variabel tetap
```simpl
angka tetap PI = 3.14159
rubah PI = 3                    # Error! Variabel tetap!
```
## Masa hidup variabel
```simpl
datum bil = 10
cetak bil                       # Mencetak 10          
{
  rubah bil = 20
  cetak bil                     # Mencetak 20

  datum bil = bil + 10          
  cetak bil                     # Mencetak 30
}
cetak bil                       # Mencetak 20
```
## Kalau & Namun 
```simpl
# Wajib memakai kurung kurawal { }
kalau salah {
  cetak "diabaikan"
} namun kalau benar {
  cetak "dieksekusi"
} namun {
  cetak "diabaikan"
}
```
## Pengulangan
```simpl
angka i = 1
# Wajib memakai kurung kurawal {}
slagi benar {
  kalau i == 2 {
    rubah i = i + 1
    lewat                         # melewati loop, lanjutkan
  } namun kalau i == 4 { henti }  # keluar dari loop
  cetak i
  rubah i = i + 1
}

untuk angka i dalam [1,2,3,4,5] { # mengiterasi baris/petik saja
  kalau i == 2 { lewat }
  kalau i == 4 { henti }
  cetak i
}
```
## Mesin 
```simpl
mesin f ==> () {          # =>(){} adalah lambda
  hasil 10		  # Mengembalikan angka 10
}
cetak f()		  # Mencetak 10
cetak f			  # Mencetak Mesin<>

mesin g = f		  # First-class

mesin h ==> (mesin f, datum n) {
  hasil f(f(n))
}
cetak h(
  =>(angka n){ hasil n*n }, 
  10
)					# Mencetak 10000

mesin penambah ==> (angka n) {		# Closure
  hasil =>(angka a) { hasil a+n }	# Menghasilkan mesin
}
mesin penambahDua = penambah(2)
cetak penambahDua(1)				# Mencetak 3
cetak penambah(5)(5)				# Mencetak 10

mesin pencetakUang ==> () { cetak "Uang" }
kerja pencetakUang()				# Eksekusi tanpa cetak
cetak pencetakUang()				# Mencetak nihil
```
## Nihil 
```simpl
# nihil adalah nilai kosong tanpa tipe yang tidak dapat dioperasikan
datum a = nihil
angka b = a + 10		  # Error! Operasi terhadap nihil
kalau a == nihil {  }		  # Error! Operasi terhadap nihil
kalau nihil?(a) { cetak "uang" }  # Mencetak "uang"
```
## Jenis
```simpl
# Definisi dengan tanda kurung ( )
jenis Mood ( great, good, normal, bad, awful )
Mood status = Mood.great
kalau status == Mood.great {
  cetak "yes"
} namun kalau status == Mood.awful {
  cetak "noo"
}
```
## Model
```simpl
# Definisi dengan tanda kurung ( )
model Pohon (
  Pohon kiri,
  Pohon kanan,
  datum isi
)

Pohon akar = Pohon(nihil, nihil, 0)
Pohon lain = Pohon(akar, nihil, 10)

cetak akar.isi			# Mencetak 0
cetak lain.isi			# Mencetak 10
cetak lain.kiri.isi		# Mencetak 0
```
## Modul
```simpl
# Dieksekusi saat pendefinisian
modul Mtk { 
	cetak "Modul Mtk Dibuat"
	angka tetap PI = 3.14159
	mesin rata2 ==> (angka a, angka b) {
		hasil (a+b)/2
	}
	mesin abs ==> (angka a) {
		kalau a < 0 { hasil -a }
		hasil a
	}
	mesin akar2 ==> (angka n) {
		angka TOLERANSI = 0.0000000000000000001
		angka tebakan = 0
		angka selanjutnya = 1
		slagi abs(tebakan - selanjutnya) > TOLERANSI {
			rubah tebakan = selanjutnya
			rubah selanjutnya = rata2(tebakan, n/tebakan)
		}
		hasil tebakan
	}
}

cetak Mtk.akar2(4)			# Mencetak 2
```


