import Flutter
import UIKit
import GoogleMaps

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Read API key from a safe local plist (uncomment and create Keys.plist to use)
    // if let path = Bundle.main.path(forResource: "Keys", ofType: "plist"),
    //    let dict = NSDictionary(contentsOfFile: path),
    //    let key = dict["MAPS_API_KEY"] as? String {
    //     GMSServices.provideAPIKey(key)
    // }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
