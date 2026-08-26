export enum AccessLevel {
  OBSERVER = 0,
  OPERATOR = 1,
  EXPERT = 2,
}

export enum AccessMode {
  UNDEFINED = -1,
  INITONLY = 1,
  READONLY = 2,
  RECONFIGURABLE = 4,
}

export enum ArchivePolicy {
  EVERY_EVENT = 0,
  NO_ARCHIVING = 1,
}

export enum Assignment {
  OPTIONAL = 0,
  MANDATORY = 1,
  INTERNAL = 2,
}

export enum NodeType {
  Leaf = 0,
  Node = 1,
}

export enum DaqDataType {
  PULSE = 0,
  TRAIN = 1,
}

export enum MetricPrefix {
  YOTTA = 'Y',
  ZETTA = 'Z',
  EXA = 'E',
  PETA = 'P',
  TERA = 'T',
  GIGA = 'G',
  MEGA = 'M',
  KILO = 'k',
  HECTO = 'h',
  DECA = 'da',
  NONE = '',
  DECI = 'd',
  CENTI = 'c',
  MILLI = 'm',
  MICRO = 'u',
  NANO = 'n',
  PICO = 'p',
  FEMTO = 'f',
  ATTO = 'a',
  ZEPTO = 'z',
  YOCTO = 'y',
}

export enum Unit {
  NUMBER = '',
  COUNT = '#',
  METER = 'm',
  GRAM = 'g',
  SECOND = 's',
  AMPERE = 'A',
  KELVIN = 'K',
  MOLE = 'mol',
  CANDELA = 'cd',
  HERTZ = 'Hz',
  RADIAN = 'rad',
  DEGREE = 'deg',
  STERADIAN = 'sr',
  NEWTON = 'N',
  PASCAL = 'Pa',
  JOULE = 'J',
  ELECTRONVOLT = 'eV',
  WATT = 'W',
  COULOMB = 'C',
  VOLT = 'V',
  FARAD = 'F',
  OHM = 'Ω',
  SIEMENS = 'S',
  WEBER = 'Wb',
  TESLA = 'T',
  HENRY = 'H',
  DEGREE_CELSIUS = 'degC',
  LUMEN = 'lm',
  LUX = 'lx',
  BECQUEREL = 'Bq',
  GRAY = 'Gy',
  SIEVERT = 'Sv',
  KATAL = 'kat',
  MINUTE = 'min',
  HOUR = 'h',
  DAY = 'd',
  YEAR = 'a',
  BAR = 'bar',
  PIXEL = 'px',
  BYTE = 'B',
  BIT = 'bit',
  METER_PER_SECOND = 'm/s',
  VOLT_PER_SECOND = 'V/s',
  AMPERE_PER_SECOND = 'A/s',
  PERCENT = '%',
  NOT_ASSIGNED = 'N_A',
  REVOLUTIONS_PER_MINUTE = 'rpm',
}

export enum Encoding {
  UNDEFINED = -1,
  GRAY = 0,
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

export enum Capabilities {
  PROVIDES_SCENES = 1,
  PROVIDES_MACROS = 2,
  PROVICES_INTERFACES = 4,
}
