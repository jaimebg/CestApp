package expo.modules.qrdecoder

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.NotFoundException
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.multi.qrcode.QRCodeMultiReader
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val MAX_SIDE = 2000

class QrDecoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QrDecoder")

    AsyncFunction("decode") { uri: String ->
      val bitmap = loadBitmap(uri) ?: return@AsyncFunction emptyList<String>()
      try {
        decode(bitmap)
      } finally {
        bitmap.recycle()
      }
    }
  }

  private fun loadBitmap(uri: String): Bitmap? {
    val path = Uri.parse(uri).path ?: return null
    if (!File(path).exists()) return null

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > MAX_SIDE) sample *= 2

    return BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
  }

  private fun decode(bitmap: Bitmap): List<String> {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    val source = RGBLuminanceSource(bitmap.width, bitmap.height, pixels)
    val hints = mapOf(DecodeHintType.TRY_HARDER to true)

    return try {
      QRCodeMultiReader()
        .decodeMultiple(BinaryBitmap(HybridBinarizer(source)), hints)
        .mapNotNull { it.text }
    } catch (error: NotFoundException) {
      emptyList()
    }
  }
}
