import ExpoModulesCore
import Vision

public class QrDecoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("QrDecoder")

    AsyncFunction("decode") { (uri: String) -> [String] in
      guard let url = URL(string: uri), url.isFileURL else { return [] }

      let request = VNDetectBarcodesRequest()
      request.symbologies = [.qr]

      do {
        try VNImageRequestHandler(url: url, options: [:]).perform([request])
      } catch {
        return []
      }

      return (request.results ?? []).compactMap { $0.payloadStringValue }
    }
  }
}
