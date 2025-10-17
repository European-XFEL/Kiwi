export enum AccessLevel {
  Observer,
  Operator,
  Expert,
}

export enum AccessMode {
  Undefined = -1,
  InitOnly = 1,
  ReadOnly = 2,
  Reconfigurable = 4,
}

export enum ArchivePolicy {
  EveryEvent,
  NoArchiving,
}

export enum Assignment {
  Optional,
  Mandatory,
  Internal,
}

export enum MetricPrefix {
  Yotta = "Y",
  Zetta = "Z",
  Exa = "E",
  Peta = "P",
  Tera = "T",
  Giga = "G",
  Mega = "M",
  Kilo = "K",
  Hecto = "h",
  Deca = "da",
  None = "",
  Deci = "d",
  Centi = "c",
  Milli = "m",
  Micro = "u",
  Nano = "n",
  Pico = "p",
  Femto = "f",
  Atto = "a",
  Zepto = "z",
  Yocto = "y",
}

export enum Unit {
  Number = "",
  Count = "#",
  Meter = "m",
  Gram = "g",
  Second = "s",
  Ampere = "A",
  Kelvin = "K",
  Mole = "mol",
  Candela = "cd",
  Hertz = "Hz",
  Radian = "rad",
  Degree = "deg",
  Steradian = "sr",
  Newton = "N",
  Pascal = "Pa",
  Joule = "J",
  ElectronVolt = "eV",
  Watt = "W",
  Coulomb = "C",
  Volt = "V",
  Farad = "F",
  Ohm = "Ω",
  Siemens = "S",
  Weber = "Wb",
  Tesla = "T",
  Henry = "H",
  DegreeCelsius = "degC",
  Lumen = "lm",
  Lux = "lx",
  Becquerel = "Bq",
  Gray = "Gy",
  Sievert = "Sv",
  Katal = "kat",
  Minute = "min",
  Hour = "h",
  Day = "d",
  Year = "a",
  Bar = "bar",
  Pixel = "px",
  Byte = "B",
  Bit = "bit",
  MeterPerSecond = "m/s",
  VoltPerSecond = "V/s",
  AmperePerSecond = "A/s",
  Percent = "%",
  NotAssigned = "N_A",
  RevolutionsPerMinute = "rpm",
}

/// Encoding type used for image data
export enum Encoding {
  Undefined = -1,
  Gray = 0,
  RGB = 1,
  RGBA = 2,
  BGR = 3,
  BGRA = 4,
  BAYER_RG = 5,
  BAYER_BG = 6,
  BAYER_GR = 7,
  BAYER_GB = 8,
  YUV444 = 9,
  YUV422_YUYV = 10,
  YUV422_UYVY = 11,
  JPEG = 12,
}

export enum NodeType {
  LEAF,
  NODE,
}
